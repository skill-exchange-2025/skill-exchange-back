import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CodingRoomsService } from '../codingrooms.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class CodingRoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(private codingRoomsService: CodingRoomsService) {}

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string }
  ) {
    console.log('dkhalna');
    const { roomId, userId } = data;

    await client.join(roomId);

    const canJoin = await this.codingRoomsService.checkUserAccess(
      roomId,
      userId
    );
    if (!canJoin) {
      client.emit('error', { message: 'Not authorized to join this room' });
      await client.leave(roomId);
      return;
    }

    // Get current room state
    const room = await this.codingRoomsService.findById(roomId);

    // Send initial code state to new user
    client.emit('initialCode', {
      code: room.currentCode,
      language: room.language,
      theme: room.theme,
    });

    // Notify others about the new user
    client.to(roomId).emit('userJoined', {
      userId,
      username: client['user']?.username || 'Anonymous',
    });
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('codeChange')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      userId: string;
      code: string;
      language?: string;
      edits?: any[]; // Monaco editor change events
    }
  ) {
    const { roomId, userId, code, language, edits } = data;

    // Check edit permissions
    const canEdit = await this.codingRoomsService.checkEditPermission(
      roomId,
      userId
    );
    if (!canEdit) {
      client.emit('error', {
        message: 'Not authorized to edit code in this room',
      });
      return;
    }

    // If we have edits (for operational transforms) send those to clients
    if (edits && edits.length > 0) {
      client.to(roomId).emit('codeEdits', { edits, userId });
    } else {
      // Otherwise send the full code (less efficient but simpler)
      await this.codingRoomsService.updateCode(roomId, code, language);
      client.to(roomId).emit('codeUpdated', { code, userId, language });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('changeLanguage')
  async handleLanguageChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; language: string }
  ) {
    const { roomId, userId, language } = data;

    const canEdit = await this.codingRoomsService.checkEditPermission(
      roomId,
      userId
    );
    if (!canEdit) {
      client.emit('error', {
        message: 'Not authorized to change language in this room',
      });
      return;
    }

    await this.codingRoomsService.updateCode(roomId, '', language);
    this.server.to(roomId).emit('languageChanged', { language, userId });
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string }
  ) {
    const { roomId, userId } = data;
    await client.leave(roomId);

    client.to(roomId).emit('userLeft', {
      userId,
      username: client['user']?.username || 'Anonymous',
    });
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('changeTheme')
  async handleThemeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; theme: string }
  ) {
    const { roomId, userId, theme } = data;

    const canEdit = await this.codingRoomsService.checkEditPermission(
      roomId,
      userId
    );
    if (!canEdit) {
      client.emit('error', {
        message: 'Not authorized to change theme in this room',
      });
      return;
    }

    await this.codingRoomsService.updateTheme(roomId, theme);
    this.server.to(roomId).emit('themeChanged', { theme, userId });
  }
}
