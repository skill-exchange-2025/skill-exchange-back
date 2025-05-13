import { ApiProperty } from '@nestjs/swagger';
import { LessonType } from '../schemas/lesson.schema';

export class InstructorDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class ListingDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;
}

export class LessonResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ enum: LessonType })
  type: LessonType;

  @ApiProperty()
  order: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  textContent?: string;

  @ApiProperty({ type: [String] })
  materials: string[];

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiProperty({ required: false })
  videoUrl?: string;

  @ApiProperty()
  isPreview: boolean;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  maxParticipants?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => InstructorDto })
  instructor: InstructorDto;

  @ApiProperty({ type: () => ListingDto })
  listing: ListingDto;
}
