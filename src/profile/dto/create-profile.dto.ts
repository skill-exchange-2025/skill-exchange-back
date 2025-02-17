import { IsString, IsOptional, IsArray, IsUrl, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  socialLinks?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  birthDate?: Date;
}