// src/messaging/messaging.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from './messaging.service';
import { Injectable, Logger } from '@nestjs/common';
import { AttachmentDto } from './dto/create-message.dto';
import { MessageDocument } from './schemas/message.schema';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/messaging',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('MessagingGateway');
  private recentlyProcessedMessages: Set<string> = new Set();

  constructor(
    private jwtService: JwtService,
    private messagingService: MessagingService
  ) {}

  afterInit() {
    setInterval(() => {
      this.server.emit('serverStatus', {
        status: 'active',
        timestamp: new Date(),
      });
    }, 30000);
  }

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      const token =
        client.handshake.auth?.token ||
        (authHeader?.startsWith('Bearer ')
          ? authHeader.substring(7)
          : authHeader);

      if (!token) {
        client.data = { userId: `temp_${client.id.substring(0, 8)}` };
        return;
      }

      try {
        const payload = this.jwtService.verify(token, { secret: 'skilly' });
        if (!payload || !payload.sub) {
          client.data = { userId: `temp_${client.id.substring(0, 8)}` };
          return;
        }

        client.data = { userId: payload.sub };
        client.join(`user_${payload.sub}`);
      } catch (error) {
        try {
          const decoded = this.jwtService.decode(token);
          if (decoded && typeof decoded === 'object' && decoded.sub) {
            client.data = { userId: decoded.sub };
            client.join(`user_${decoded.sub}`);
            return;
          }
        } catch (decodeError) {}
        client.data = { userId: `temp_${client.id.substring(0, 8)}` };
      }
    } catch (error) {
      client.data = { userId: `temp_${client.id.substring(0, 8)}` };
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      client.leave(`user_${client.data.userId}`);
    }
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channelId: string }) {
    try {
      const userId = client.data.userId;

      // Join the socket room
      client.join(`channel_${payload.channelId}`);

      // Join the channel in the database
      const channel = await this.messagingService.joinChannel(
        payload.channelId,
        userId
      );

      // Notify others in the channel
      client.to(`channel_${payload.channelId}`).emit('userJoinedChannel', {
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

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: Socket,
    payload: {
      channelId: string;
      content: string;
      attachment?: AttachmentDto;
      clientMessageId?: string;
    }
  ) {
    try {
      const userId = client.data.userId;
      const clientMessageId =
        payload.clientMessageId ||
        `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      

      // Check for duplicates
      if (this.recentlyProcessedMessages.has(clientMessageId)) {
        return { success: true, isDuplicate: true };
      }

      // Track this message
      this.recentlyProcessedMessages.add(clientMessageId);
      setTimeout(() => {
        this.recentlyProcessedMessages.delete(clientMessageId);
      }, 10000);

      // Create temp message for immediate UI feedback
      const tempMessage = {
        _id: clientMessageId,
        sender: { _id: userId },
        content: payload.content,
        channelId: payload.channelId,
        createdAt: new Date(),
        isTemp: true,
      };

      // Send temp message to everyone including sender
      this.server
        .to(`channel_${payload.channelId}`)
        .emit('newMessage', tempMessage);

      // Create message in database
      const message = await this.messagingService.createMessage(userId, {
        channelId: payload.channelId,
        content: payload.content,
        attachment: payload.attachment,
      });

      // Populate sender info
      const populatedMessage = await this.messagingService.populateMessage(
        message as MessageDocument
      );

      // Send final message only to others (not sender) to prevent duplicates
      client.to(`channel_${payload.channelId}`).emit('newMessage', {
        ...populatedMessage.toJSON(),
        tempId: clientMessageId,
      });

      return { success: true, message: populatedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(client: Socket, payload: { channelId: string }) {
    try {
      const userId = client.data.userId;
      client.to(`channel_${payload.channelId}`).emit('userTyping', {
        userId,
        channelId: payload.channelId,
        timestamp: Date.now(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(client: Socket, payload: { channelId: string }) {
    try {
      const userId = client.data.userId;
      client.to(`channel_${payload.channelId}`).emit('userStoppedTyping', {
        userId,
        channelId: payload.channelId,
        timestamp: Date.now(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('systemMessage')
  async handleSystemMessage(
    client: Socket,
    payload: {
      action: 'join' | 'leave';
      channelId: string;
      user: { _id: string; name: string };
    }
  ) {
    try {
      const { action, channelId, user } = payload;

      // Create a system message
      const systemMessage = {
        _id: `system_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 7)}`,
        type: 'system',
        action: action,
        user: user,
        channelId: channelId,
        content:
          action === 'join'
            ? `${user.name} joined the channel`
            : `${user.name} left the channel`,
        createdAt: new Date(),
      };

      // Broadcast to all users in the channel including sender
      this.server.to(`channel_${channelId}`).emit('newMessage', systemMessage);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}