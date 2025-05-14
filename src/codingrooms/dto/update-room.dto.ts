// src/codingrooms/dto/update-room.dto.ts
export class UpdateRoomDto {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  language?: string;
  theme?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'archived';
}
