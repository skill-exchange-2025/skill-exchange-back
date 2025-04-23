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

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  buyerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  sellerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  startTime: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  endTime: Date;
}
