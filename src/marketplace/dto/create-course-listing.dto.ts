import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';
import { ListingType } from '../schemas/listing.schema';

export class CreateCourseListingDto extends CreateListingDto {
  @ApiProperty({ example: ListingType.COURSE })
  type: ListingType.COURSE;

  @ApiProperty({
    example: [
      'https://example.com/course-content1.pdf',
      'https://example.com/course-video.mp4',
    ],
    required: false,
    description: 'URLs to course content (PDFs, videos, etc.)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentUrls?: string[];

  @ApiProperty({
    example: 'This course includes 5 PDFs and 3 video tutorials',
    required: false,
  })
  @IsString()
  @IsOptional()
  contentDescription?: string;
}
