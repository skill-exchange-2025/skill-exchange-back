// src/messaging/dto/create-channel.dto.ts
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  memberIds?: string[];
}
