// src/codingrooms/dto/create-room.dto.ts
export class CreateRoomDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  language?: string;
  theme?: string;
  tags?: string[];
  currentCode?: string;
}
