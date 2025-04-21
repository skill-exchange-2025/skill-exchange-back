import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateFeedbackDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminResponse?: string;

  @ApiProperty({
    required: false,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
  })
  @IsOptional()
  @IsEnum(['pending', 'in-progress', 'resolved', 'rejected'])
  status?: 'pending' | 'in-progress' | 'resolved' | 'rejected';
}
