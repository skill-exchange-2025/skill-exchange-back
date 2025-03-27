// src/messaging/messaging.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from './messaging.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'messaging',
  transports: ['websocket', 'polling'],
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private messagingService: MessagingService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.join(`user_${payload.sub}`);
    } catch (error) {
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: Socket) {
    client.leave(`user_${client.data.userId}`);
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channelId: string }) {
    try {
      const userId = client.data.userId;
      // Join the channel in the database
      const channel = await this.messagingService.joinChannel(
        payload.channelId,
        userId
      );

      // Join the socket room
      client.join(`channel_${payload.channelId}`);

      // Notify others in the channel
      this.server.to(`channel_${payload.channelId}`).emit('userJoinedChannel', {
        channelId: payload.channelId,
        userId: userId,
        timestamp: new Date(),
      });

      return { success: true, channel };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(client: Socket, payload: { channelId: string }) {
    try {
      const userId = client.data.userId;
      // Leave the channel in the database
      await this.messagingService.leaveChannel(payload.channelId, userId);

      // Leave the socket room
      client.leave(`channel_${payload.channelId}`);

      // Notify others in the channel
      this.server.to(`channel_${payload.channelId}`).emit('userLeftChannel', {
        channelId: payload.channelId,
        userId: userId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: Socket,
    payload: { messageId: string; channelId: string }
  ) {
    try {
      const userId = client.data.userId;
      // Delete the message from the database
      await this.messagingService.deleteMessage(payload.messageId, userId);

      // Notify all users in the channel that a message was deleted
      this.server.to(`channel_${payload.channelId}`).emit('messageDeleted', {
        messageId: payload.messageId,
        channelId: payload.channelId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getChannels')
  async handleGetChannels(
    client: Socket,
    payload: { page?: number; limit?: number }
  ) {
    try {
      const userId = client.data.userId;
      const page = payload.page || 1;
      const limit = payload.limit || 20;

      const result = await this.messagingService.getAllChannels(
        userId,
        page,
        limit
      );

      return {
        success: true,
        channels: result.channels,
        total: result.total,
        page,
        limit,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    client: Socket,
    payload: { messageId: string; channelId: string; emoji: string }
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagingService.addReaction(
        payload.messageId,
        userId,
        payload.emoji
      );

      // Notify all users in the channel about the new reaction
      this.server.to(`channel_${payload.channelId}`).emit('reactionAdded', {
        messageId: payload.messageId,
        channelId: payload.channelId,
        emoji: payload.emoji,
        userId: userId,
        timestamp: new Date(),
      });

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('removeReaction')
  async handleRemoveReaction(
    client: Socket,
    payload: { messageId: string; channelId: string; emoji: string }
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagingService.removeReaction(
        payload.messageId,
        userId,
        payload.emoji
      );

      // Notify all users in the channel about the removed reaction
      this.server.to(`channel_${payload.channelId}`).emit('reactionRemoved', {
        messageId: payload.messageId,
        channelId: payload.channelId,
        emoji: payload.emoji,
        userId: userId,
        timestamp: new Date(),
      });

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getChannelMembers')
  async handleGetChannelMembers(
    client: Socket,
    payload: { channelId: string }
  ) {
    try {
      const members = await this.messagingService.getChannelMembers(
        payload.channelId
      );

      return {
        success: true,
        members,
        channelId: payload.channelId,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
