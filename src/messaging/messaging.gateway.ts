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

      // Get user info to include in the event
      const userInfo = await this.messagingService.getUserInfo(userId);

      // Notify others in the channel with user info
      client.to(`channel_${payload.channelId}`).emit('userJoinedChannel', {
        channelId: payload.channelId,
        userId: userId,
        user: {
          _id: userId,
          name: userInfo?.name || 'Unknown User',
        },
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

      // Get user info before leaving
      const userInfo = await this.messagingService.getUserInfo(userId);

      // Leave the channel in the database
      await this.messagingService.leaveChannel(payload.channelId, userId);

      // Leave the socket room
      client.leave(`channel_${payload.channelId}`);

      // Notify others in the channel with user info
      this.server.to(`channel_${payload.channelId}`).emit('userLeftChannel', {
        channelId: payload.channelId,
        userId: userId,
        user: {
          _id: userId,
          name: userInfo?.name || 'Unknown User',
        },
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
    payload: { messageId: string; channelId?: string; channel?: string }
  ) {
    try {
      const userId = client.data.userId;
      // Use either channelId or channel field, whichever is available
      const channelId = payload.channelId || payload.channel;

      if (!channelId) {
        this.logger.error(
          `No channel ID provided for message deletion: ${payload.messageId}`
        );
        return { success: false, error: 'Channel ID is required' };
      }

      this.logger.log(
        `User ${userId} deleting message ${payload.messageId} in channel ${channelId}`
      );

      // Delete the message from the database
      await this.messagingService.deleteMessage(payload.messageId, userId);

      // Notify all users in the channel that a message was deleted (including the sender)
      this.server.to(`channel_${channelId}`).emit('messageDeleted', {
        messageId: payload.messageId,
        channelId: channelId,
        userId: userId,
        timestamp: new Date(),
      });

      // Also emit directly to the client for immediate confirmation
      client.emit('messageDeleted', {
        messageId: payload.messageId,
        channelId: channelId,
        userId: userId,
        timestamp: new Date(),
      });

      this.logger.log(
        `Successfully deleted message ${payload.messageId} and notified channel ${channelId}`
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
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
      attachment?: AttachmentDto | File;
      clientMessageId?: string;
      pendingAttachment?: boolean;
      // Reply fields
      isReply?: boolean;
      parentMessageId?: string;
      replyPreview?: {
        content: string;
        sender: string;
        senderName: string;
      };
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

      // Handle File object from web socket
      // Note: For real-time updates, we'll create a simple attachment reference
      // The actual file will be uploaded through the REST API
      let attachment: AttachmentDto | undefined = undefined;

      if (payload.attachment) {
        // Log the attachment we received
        this.logger.log(
          `Received attachment in socket message: ${JSON.stringify(payload.attachment)}`
        );

        // If it's a client-side File object (from socket.io), create a placeholder
        // The actual file upload will happen through the REST API
        if (!(payload.attachment as AttachmentDto).filename) {
          const file = payload.attachment as any;
          attachment = {
            // Create a temporary reference with basic info - actual file will be saved via HTTP API
            filename: `pending_${clientMessageId}`,
            originalname: file.originalname || file.name || 'attachment',
            mimetype: file.mimetype || file.type || 'application/octet-stream',
            size: file.size || 0,
            path: 'pending-upload', // Will be replaced when actual file is uploaded
            isPending: true, // Mark as pending real upload
          };
        } else {
          // It's already an AttachmentDto object
          attachment = payload.attachment as AttachmentDto;
        }

        // Always set isPending if this is a socket message with pendingAttachment flag
        if (payload.pendingAttachment) {
          attachment.isPending = true;
        }

        this.logger.log(
          `Processed attachment for database: ${JSON.stringify(attachment)}`
        );
      }

      // Create message in database
      const message = await this.messagingService.createMessage(userId, {
        channelId: payload.channelId,
        content: payload.content,
        attachment,
        clientMessageId, // Pass the client message ID for linking purposes
        // Include reply data if this is a reply
        isReply: payload.isReply,
        parentMessageId: payload.parentMessageId,
        replyPreview: payload.replyPreview,
      });

      // Populate sender info
      const populatedMessage = await this.messagingService.populateMessage(
        message as MessageDocument
      );

      // Check if this is a reply and notify all users about the reply
      if (payload.isReply && payload.parentMessageId) {
        // Emit special event for replies so clients can update UI accordingly
        this.server.to(`channel_${payload.channelId}`).emit('messageReplied', {
          parentMessageId: payload.parentMessageId,
          reply: populatedMessage.toJSON(),
          replyCount: (populatedMessage.replyCount || 0) + 1,
        });
      }

      // Send complete message to all clients in the channel (including sender)
      this.server.to(`channel_${payload.channelId}`).emit('newMessage', {
        ...populatedMessage.toJSON(),
        tempId: clientMessageId,
        pendingAttachment: attachment?.isPending,
      });

      return { success: true, message: populatedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getMessageReplies')
  async handleGetMessageReplies(
    client: Socket,
    payload: { messageId: string; page?: number; limit?: number }
  ) {
    try {
      const userId = client.data.userId;
      const page = payload.page || 1;
      const limit = payload.limit || 20;

      const result = await this.messagingService.getMessageReplies(
        payload.messageId,
        page,
        limit
      );

      return {
        success: true,
        replies: result.replies,
        total: result.total,
        page,
        limit,
      };
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

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    client: Socket,
    payload: { messageId: string; channelId: string; emoji: string }
  ) {
    try {
      const userId = client.data.userId;
      this.logger.log(
        `User ${userId} adding reaction ${payload.emoji} to message ${payload.messageId} in channel ${payload.channelId}`
      );

      // Add reaction to the database
      const updatedMessage = await this.messagingService.addReaction(
        payload.messageId,
        userId,
        payload.emoji
      );

      // Convert the Map to a plain object for better serialization
      const reactionsObject = {};
      if (updatedMessage.reactions) {
        updatedMessage.reactions.forEach((users, emoji) => {
          reactionsObject[emoji] = users;
        });
      }

      // Notify all users in the channel about the new reaction (broadcast to everyone including sender)
      this.server.to(`channel_${payload.channelId}`).emit('reactionAdded', {
        messageId: payload.messageId,
        emoji: payload.emoji,
        userId: userId,
        reactions: reactionsObject,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: updatedMessage,
        reactions: reactionsObject,
      };
    } catch (error) {
      this.logger.error('Error adding reaction:', error.message);
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
      this.logger.log(
        `User ${userId} removing reaction ${payload.emoji} from message ${payload.messageId} in channel ${payload.channelId}`
      );

      // Remove reaction from the database
      const updatedMessage = await this.messagingService.removeReaction(
        payload.messageId,
        userId,
        payload.emoji
      );

      // Convert the Map to a plain object for better serialization
      const reactionsObject = {};
      if (updatedMessage.reactions) {
        updatedMessage.reactions.forEach((users, emoji) => {
          reactionsObject[emoji] = users;
        });
      }

      // Notify all users in the channel about the removed reaction (broadcast to everyone including sender)
      this.server.to(`channel_${payload.channelId}`).emit('reactionRemoved', {
        messageId: payload.messageId,
        emoji: payload.emoji,
        userId: userId,
        reactions: reactionsObject,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: updatedMessage,
        reactions: reactionsObject,
      };
    } catch (error) {
      this.logger.error('Error removing reaction:', error.message);
      return { success: false, error: error.message };
    }
  }
}
