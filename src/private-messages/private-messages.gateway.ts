import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Server, Socket } from 'socket.io';
import { FriendRequestService } from 'src/friend-requests/friend-requests.service';
import { User } from 'src/users/schemas/user.schema';

interface AuthenticatedSocket extends Socket {
  user?: User & { _id: string };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(JwtAuthGuard)
export class PrivateMessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(private friendRequestService: FriendRequestService) {}

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.user?._id?.toString();
    console.log('Client connected:', userId);
    if (userId) {
      this.userSockets.set(userId, client.id);
      client.emit('connected', {});
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.user?._id?.toString();
    console.log('Client disconnected:', userId);
    if (userId) {
      this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('getFriends')
async handleGetFriends(@ConnectedSocket() client: AuthenticatedSocket) {
  const userId = client.user?._id?.toString();
  if (userId) {
    try {
      const friends = await this.friendRequestService.getFriends(userId);
      client.emit('friendsList', friends);
    } catch (error) {
      console.error('Get friends error:', error);
      client.emit('error', { message: 'Failed to get friends list' });
    }
  }
}
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    this.userSockets.set(userId, client.id);
    client.join(`user-${userId}`);
  }

  @SubscribeMessage('privateMessage')
  handlePrivateMessage(@MessageBody() data: any) {
    const recipientSocket = this.userSockets.get(data.recipientId);
    if (recipientSocket) {
      this.server.to(recipientSocket).emit('newPrivateMessage', data);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { senderId: string; recipientId: string }) {
    const recipientSocket = this.userSockets.get(data.recipientId);
    if (recipientSocket) {
      this.server.to(recipientSocket).emit('userTyping', data.senderId);
    }
  }

  @SubscribeMessage('friendRequest')
  async handleFriendRequest(@MessageBody() data: { senderId: string; recipientEmail: string }) {
    try {
      const request = await this.friendRequestService.create(data.senderId, data.recipientEmail);
      const recipientSocket = this.userSockets.get(request.recipient.toString());
      if (recipientSocket) {
        this.server.to(recipientSocket).emit('newFriendRequest', request);
      }
    } catch (error) {
      console.error('Friend request error:', error);
    }
  }

  @SubscribeMessage('acceptFriendRequest')
async handleAcceptFriendRequest(@MessageBody() data: { requestId: string; userId: string }) {
  try {
    const acceptedRequest = await this.friendRequestService.accept(data.requestId, data.userId);
    
    // Add null check here
    if (acceptedRequest && acceptedRequest.sender) {
      const senderSocket = this.userSockets.get(acceptedRequest.sender.toString());
      if (senderSocket) {
        this.server.to(senderSocket).emit('friendRequestAccepted', acceptedRequest);
      }
    }
  } catch (error) {
    console.error('Accept friend request error:', error);
  }
}

  @SubscribeMessage('rejectFriendRequest')
  async handleRejectFriendRequest(@MessageBody() data: { requestId: string; userId: string }) {
    try {
      const rejectedRequest = await this.friendRequestService.reject(data.requestId, data.userId);
      const senderSocket = this.userSockets.get(rejectedRequest.sender.toString());
      if (senderSocket) {
        this.server.to(senderSocket).emit('friendRequestRejected', rejectedRequest);
      }
    } catch (error) {
      console.error('Reject friend request error:', error);
    }
  }

  @SubscribeMessage('getFriendRequests')
  async handleGetFriendRequests(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.user?._id?.toString();
    if (userId) {
      try {
        const requests = await this.friendRequestService.getFriendRequests(userId);
        client.emit('friendRequests', requests);
      } catch (error) {
        console.error('Get friend requests error:', error);
      }
    }
  }

  public getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }
}
