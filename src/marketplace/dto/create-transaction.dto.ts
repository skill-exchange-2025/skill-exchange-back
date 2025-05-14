// src/marketplace/dto/create-transaction.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  listingId: string;

  @IsOptional()
  @IsDate()
  meetingStartTime?: Date;

  @IsOptional()
  @IsNumber()
  meetingDuration?: number;
}
