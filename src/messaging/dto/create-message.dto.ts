// src/messaging/dto/create-message.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  IsOptional,
  IsObject,
  ValidateIf,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachmentDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  originalname: string;

  @ApiProperty()
  @IsString()
  mimetype: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  @IsString()
  path: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isPending?: boolean;
}

export class ReplyPreviewDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiProperty()
  @IsString()
  senderName: string;
}

export class CreateMessageDto {
  @ApiProperty({ required: false })
  @IsString()
  @ValidateIf((o) => !o.attachment)
  @IsNotEmpty({ message: 'Content is required when no attachment is provided' })
  @MaxLength(2000)
  content?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ type: AttachmentDto, required: false })
  @IsObject()
  @IsOptional()
  attachment?: AttachmentDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientMessageId?: string;

  // Reply fields
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  parentMessageId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  replyPreview?: ReplyPreviewDto;

  @ApiProperty({ required: false })
  @IsOptional()
  isReply?: boolean;
}
