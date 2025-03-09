// src/marketplace/dto/create-review.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsMongoId, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty()
  @IsMongoId()
  transactionId: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great experience working with this developer!', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}