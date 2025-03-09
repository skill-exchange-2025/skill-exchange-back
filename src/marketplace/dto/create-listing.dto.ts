// src/marketplace/dto/create-listing.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ example: 'Advanced React Development' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'I will help you build complex React applications with Redux and hooks.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'React' })
  @IsString()
  skillName: string;

  @ApiProperty({ example: 'Web Development' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'Expert' })
  @IsString()
  proficiencyLevel: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  price: number;

  @ApiProperty({ example: ['frontend', 'javascript', 'react'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesUrl?: string[];
}