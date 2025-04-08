// src/marketplace/dto/create-transaction.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsMongoId } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty()
  @IsMongoId()
  listingId: string;



  
}