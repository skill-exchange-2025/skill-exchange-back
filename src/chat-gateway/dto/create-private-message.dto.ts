// src/chat-gateway/dto/create-private-message.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrivateMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sender: string;  // Sender's user ID

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recipient: string;  // Recipient's user ID

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;  // Message content
}
