import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ['bug', 'improvement', 'feature'] })
  @IsEnum(['bug', 'improvement', 'feature'])
  type: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  @IsEnum(['low', 'medium', 'high'])
  priority: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  attachments: string[];

  @ApiProperty({
    enum: ['in_progress', 'pending', 'resolved', 'rejected'],
    default: 'pending',
  })
  @IsOptional()
  @IsEnum(['in_progress', 'pending', 'resolved', 'rejected'])
  status?: string = 'pending';
}
