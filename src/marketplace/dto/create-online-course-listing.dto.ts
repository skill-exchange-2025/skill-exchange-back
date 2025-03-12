import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';
import { ListingType } from '../schemas/listing.schema';

export class CreateOnlineCourseListingDto extends CreateListingDto {
  @ApiProperty({ example: ListingType.ONLINE_COURSE })
  type: ListingType.ONLINE_COURSE;

  @ApiProperty({ example: 'New York City', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Maximum number of students',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxStudents?: number;

  @ApiProperty({ example: '2023-12-01', required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2023-12-15', required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 'https://example.com/video.mp4', required: false })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    example: [
      'https://example.com/material1.pdf',
      'https://example.com/material2.pdf',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Duration in hours',
  })
  @IsNumber()
  @Min(0.5)
  @IsOptional()
  durationHours?: number;
}
