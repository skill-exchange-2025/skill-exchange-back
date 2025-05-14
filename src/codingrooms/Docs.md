# Coding Rooms Module Documentation

This module provides real-time collaborative coding rooms with permission controls.

## HTTP Endpoints

### Room Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/coding-rooms` | Create a new coding room |
| `GET` | `/coding-rooms` | Get all available rooms (with optional `?public=true` query) |
| `GET` | `/coding-rooms/search?q=term` | Search rooms by name, description or tags |
| `GET` | `/coding-rooms/:id` | Get a specific room by ID |
| `PUT` | `/coding-rooms/:id` | Update room details |
| `DELETE` | `/coding-rooms/:id` | Delete a room |

### Participant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/coding-rooms/:id/join` | Join a room as a participant |
| `PUT` | `/coding-rooms/:id/participants/:userId/role` | Change a participant's role |
| `DELETE` | `/coding-rooms/:id/participants/:participantId` | Remove a participant |

### Room Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/coding-rooms/:id/theme` | Update room theme |

## WebSocket Events

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `{ roomId, userId }` | Join a coding room |
| `codeChange` | `{ roomId, userId, code, language?, edits? }` | Send code changes |
| `changeLanguage` | `{ roomId, userId, language }` | Change the coding language |
| `changeTheme` | `{ roomId, userId, theme }` | Change the editor theme |
| `leaveRoom` | `{ roomId, userId }` | Leave a coding room |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `initialCode` | `{ code, language, theme }` | Initial room state on join |
| `codeUpdated` | `{ code, userId, language }` | Full code update |
| `codeEdits` | `{ edits, userId }` | Granular code changes |
| `languageChanged` | `{ language, userId }` | Language change notification |
| `themeChanged` | `{ theme, userId }` | Theme change notification |
| `userJoined` | `{ userId, username }` | User joined notification |
| `userLeft` | `{ userId, username }` | User left notification |
| `error` | `{ message }` | Error message |

## Complete Module

```typescript
// src/codingrooms/codingrooms.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CodingRoomsController } from './codingrooms.controller';
import { CodingRoomsService } from './codingrooms.service';
import { CodingRoomGateway } from './gateways/codingroom.gateway';
import { CodingRoom, CodingRoomSchema } from './schemas/codingroom.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CodingRoom.name, schema: CodingRoomSchema }]),
    AuthModule,// src/types/codingRoom.ts
    export enum ParticipantRole {
      VIEWER = 'viewer',
      EDITOR = 'editor',
      OWNER = 'owner',
    }
    
    export interface Participant {
      user: {
        _id: string;
        username: string;
        email: string;
      };
      role: ParticipantRole;
    }
    
    export interface CodingRoom {
      _id: string;
      name: string;
      description?: string;
      status: 'active' | 'inactive' | 'archived';
      participants: Participant[];
      creator: {
        _id: string;
        username: string;
        email: string;
      };
      currentCode: string;
      language: string;
      theme: string;
      isPrivate: boolean;
      tags: string[];
      createdAt: string;
      updatedAt: string;
    }
    UsersModule,
  ],
  controllers: [CodingRoomsController],
  providers: [CodingRoomsService, CodingRoomGateway],
  exports: [CodingRoomsService],
})
export class CodingRoomsModule {}
```

Frontend clients can connect to the WebSocket using libraries like `socket.io-client`:

```typescript
// Example client-side code
const socket = io('http://your-server-url', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Join a room
socket.emit('joinRoom', { roomId: 'room-id', userId: 'current-user-id' });

// Listen for initial code when joining
socket.on('initialCode', ({ code, language, theme }) => {
  // Initialize editor with code, language and theme
});

// Listen for code updates from other users
socket.on('codeUpdated', ({ code, userId }) => {
  // Update editor with new code
});

// Send code changes
socket.emit('codeChange', {
  roomId: 'room-id',
  userId: 'current-user-id',
  code: 'updated code',
  language: 'javascript'
});
```

The module integrates with the existing authentication system to provide secure access controls, permission management, and real-time collaborative editing.
