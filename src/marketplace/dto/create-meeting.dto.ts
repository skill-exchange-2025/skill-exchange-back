import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDate, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeetingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  listingId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  sellerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  meetingStartTime: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  meetingDuration: number;
}
