  import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { UnauthorizedException, UseGuards } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { Server, Socket } from 'socket.io';
  import { FriendRequestService } from 'src/friend-requests/friend-requests.service';
  import { User } from 'src/users/schemas/user.schema';
  import { PrivateMessagesService } from './private-messages.service';
  import { InjectModel } from '@nestjs/mongoose';
import { PrivateMessage } from './private-message.schema';
import { Model } from 'mongoose';

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
    private onlineUsers = new Set<string>();
    private socket: Socket | null = null;
    private connected: boolean = false;
    private messageListener: ((message: any) => void) | null = null;

    constructor(
      private readonly friendRequestService: FriendRequestService,
      private readonly privateMessagesService: PrivateMessagesService,
      @InjectModel(PrivateMessage.name)
      private readonly privateMessageModel: Model<PrivateMessage>
    ) {}

    handleConnection(client: AuthenticatedSocket) {
      const userId = client.user?._id?.toString();
      console.log('Client connected:', userId);
      if (userId) {
        this.userSockets.set(userId, client.id);
        this.onlineUsers.add(userId);
        this.server.emit('userOnlineStatus', {
          userId: userId,
          isOnline: true
        });
        // this.server.emit('userOnline', userId);
        client.emit('connected', {});
        console.log('Client connected:', userId);
      }
    }

    handleDisconnect(client: AuthenticatedSocket) {
      const userId = client.user?._id?.toString();
      console.log('Client disconnected:', userId);
      if (userId) {
        this.userSockets.delete(userId);
        this.onlineUsers.delete(userId);
        // this.server.emit('userOffline', userId);
        
    console.log('Client disconnected:', userId);
      }
    }

@SubscribeMessage('voiceMessage')
async handleVoiceMessage(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: { 
    recipientId: string; 
    audioUrl: string;
    duration: number;
  }
) {
  console.log('Received voice message data:', data);
  // console.log('Sender ID:', senderId);
  console.log('Audio URL:', data.audioUrl);
  try {
    const senderId = client.user?._id?.toString();
    if (!senderId) {
      throw new Error('User not authenticated');
    }

    const savedMessage = await this.privateMessagesService.createVoiceMessage(
      senderId,
      {
        recipientId: data.recipientId,
        audioUrl: data.audioUrl,
        duration: data.duration
      }
    );

    // Emit to recipient
    const recipientSocket = this.userSockets.get(data.recipientId);
    if (recipientSocket) {
      this.server.to(recipientSocket).emit('newVoiceMessage', savedMessage);
    }

    // Emit back to sender
    client.emit('voiceMessageSaved', savedMessage);

  } catch (error) {
    console.error('Error handling voice message:', error);
    client.emit('error', { message: 'Failed to send voice message' });
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
    async handlePrivateMessage(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() data: { recipientId: string; content: string; replyTo?: string }
    ) {
      try {
        const senderId = client.user?._id?.toString();
        if (!senderId) {
          throw new Error('User not authenticated');
        }
    
        // Create message using service
        const savedMessage = await this.privateMessagesService.createMessage(
          senderId,
          {
            recipientId: data.recipientId,
            content: data.content,
            replyTo: data.replyTo
          }
        );
    
        // Add null check here
        if (!savedMessage) {
          throw new Error('Failed to save message');
        }
    
        // Now it's safe to access savedMessage._id
        const populatedMessage = await this.privateMessageModel
          .findById(savedMessage._id)
          .populate('sender', '_id name')
          .populate('recipient', '_id name')
          .populate('replyTo.sender', '_id name')
          .exec();
    
        // Add null check for populatedMessage
        if (!populatedMessage) {
          throw new Error('Failed to populate message');
        }
    
        // Emit to recipient
        const recipientSocket = this.userSockets.get(data.recipientId);
        if (recipientSocket) {

          console.log('Recipient socket:', recipientSocket);
          this.server.to(recipientSocket).emit('newPrivateMessage', populatedMessage);
        }
    
        // Emit back to sender
        client.emit('messageSaved', populatedMessage);
    
      } catch (error) {
        console.error('Error handling private message:', error);
        client.emit('error', { 
          message: error instanceof UnauthorizedException 
            ? error.message 
            : 'Failed to send message' 
        });
      }
    }
  @SubscribeMessage('getMessageHistory')
  async handleGetMessageHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { otherUserId: string }
  ) {
    try {
      const userId = client.user?._id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const messages = await this.privateMessagesService.getMessagesBetweenUsers(
        userId,
        data.otherUserId
      );
      
      client.emit('messageHistory', messages);
    } catch (error) {
      console.error('Error getting message history:', error);
      client.emit('error', { message: 'Failed to get message history' });
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
    @SubscribeMessage('getSentFriendRequests')
async handleGetSentFriendRequests(@ConnectedSocket() client: AuthenticatedSocket) {
  const userId = client.user?._id?.toString();
  if (userId) {
    try {
      const requests = await this.friendRequestService.getSentFriendRequests(userId);
      client.emit('sentFriendRequests', requests);
    } catch (error) {
      console.error('Get sent friend requests error:', error);
      client.emit('error', { message: 'Failed to get sent friend requests' });
    }
  }
}
// Add this with your other listening methods
listenForSentFriendRequests(callback: (requests: any[]) => void) {
  if (this.socket) {
    this.socket.on('sentFriendRequests', callback);
  }
}
@SubscribeMessage('addReaction')
async handleAddReaction(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: { messageId: string; type: string }
) {
  try {
    const userId = client.user?._id?.toString();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const updatedMessage = await this.privateMessagesService.addReaction(
      userId,
      data.messageId,
      data.type
    );

    // Notify both sender and recipient about the new reaction
    client.emit('reactionAdded', updatedMessage);

    // Notify the other user
    const otherUserId = updatedMessage.sender.toString() === userId 
      ? updatedMessage.recipient.toString() 
      : updatedMessage.sender.toString();
    
    const otherUserSocket = this.userSockets.get(otherUserId);
    if (otherUserSocket) {
      this.server.to(otherUserSocket).emit('reactionAdded', updatedMessage);
    }

  } catch (error) {
    console.error('Error adding reaction:', error);
    client.emit('error', { message: 'Failed to add reaction' });
  }
}

@SubscribeMessage('removeReaction')
async handleRemoveReaction(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: { messageId: string }
) {
  try {
    const userId = client.user?._id?.toString();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const updatedMessage = await this.privateMessagesService.removeReaction(
      userId,
      data.messageId
    );

    // Notify both users about the removed reaction
    client.emit('reactionRemoved', updatedMessage);

    // Notify the other user
    const otherUserId = updatedMessage.sender.toString() === userId 
      ? updatedMessage.recipient.toString() 
      : updatedMessage.sender.toString();
    
    const otherUserSocket = this.userSockets.get(otherUserId);
    if (otherUserSocket) {
      this.server.to(otherUserSocket).emit('reactionRemoved', updatedMessage);
    }

  } catch (error) {
    console.error('Error removing reaction:', error);
    client.emit('error', { message: 'Failed to remove reaction' });
  }
}
getSentFriendRequests() {
  if (this.socket && this.connected) {
    this.socket.emit('getSentFriendRequests');
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
    @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string }
  ) {
    try {
      const userId = client.user?._id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await this.privateMessagesService.deleteMessage(
        userId,
        data.messageId
      );

      // Notify both sender and recipient about the deletion
      client.emit('messageDeleted', result);
      
      // Find the recipient's socket and notify them as well
      const message = await this.privateMessageModel.findById(data.messageId);
      if (message) {
        const recipientId = message.recipient.toString();
        const recipientSocket = this.userSockets.get(recipientId);
        if (recipientSocket) {
          this.server.to(recipientSocket).emit('messageDeleted', result);
        }
      }

    } catch (error) {
      console.error('Error deleting message:', error);
      client.emit('error', { 
        message: error instanceof UnauthorizedException 
          ? error.message 
          : 'Failed to delete message' 
      });
    }
  }
  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; content: string }
  ) {
    try {
      const userId = client.user?._id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updatedMessage = await this.privateMessagesService.editMessage(
        userId,
        data.messageId,
        { content: data.content }
      );

      // Notify both sender and recipient about the edit
      client.emit('messageUpdated', updatedMessage);
      
      // Find the recipient's socket and notify them as well
      const message = await this.privateMessageModel.findById(data.messageId);
      if (message) {
        const recipientId = message.recipient.toString();
        const recipientSocket = this.userSockets.get(recipientId);
        if (recipientSocket) {
          this.server.to(recipientSocket).emit('messageUpdated', updatedMessage);
        }
      }

    } catch (error) {
      console.error('Error editing message:', error);
      client.emit('error', { 
        message: error instanceof UnauthorizedException 
          ? error.message 
          : 'Failed to edit message' 
      });
    }
  }

    public getUserSocket(userId: string): string | undefined {
      return this.userSockets.get(userId);
    }
    // Listen for private messages
    listenForPrivateMessages(callback: (message: any) => void) {
      if (this.socket) {
        this.messageListener = (message: any) => {
          console.log('Received private message:', message);
          callback(message);
        };
        this.socket.on('newPrivateMessage', (message) => {
          console.log('Received private message:', message);
          callback(message);
        });
      }
    }

    // Stop listening for private messages
    stopListeningForPrivateMessages() {
      if (this.socket && this.messageListener) {
        this.socket.off('newPrivateMessage', this.messageListener);
        this.messageListener = null;
      }
    }

    // Send private message
    sendPrivateMessage(data: { recipientId: string; content: string }) {
      if (this.socket && this.connected) {
        console.log('Sending private message:', data);
        this.socket.emit('privateMessage', data);
      }
    }

    // Emit typing event for private messages
    emitPrivateTyping(data: { senderId: string; recipientId: string }) {
      if (this.socket && this.connected) {
        this.socket.emit('typing', data);
      }
    }

    // Listen for typing events
    listenForTyping(callback: (senderId: string) => void) {
      if (this.socket) {
        this.socket.on('userTyping', callback);
      }
    }

    // Friend requests related methods
    listenForFriendRequests(callback: (request: any) => void) {
      if (this.socket) {
        this.socket.on('newFriendRequest', callback);
        this.socket.on('friendRequestAccepted', callback);
        this.socket.on('friendRequestRejected', callback);
      }
    }

    getFriends() {
      if (this.socket && this.connected) {
        this.socket.emit('getFriends');
      }
    }

    listenForFriendsList(callback: (friends: any[]) => void) {
      if (this.socket) {
        this.socket.on('friendsList', callback);
      }
    }

    // Join user's private room
    joinPrivateRoom(userId: string) {
      if (this.socket && this.connected) {
        this.socket.emit('join', userId);
      }
    }

  }
