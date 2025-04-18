import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(JwtAuthGuard)
export class PrivateMessagesGateway {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

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
}