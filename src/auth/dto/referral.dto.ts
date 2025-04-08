import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ReferralDto {
  @ApiProperty({
    example: 'friend@example.com',
    description: 'Email of the friend who referred the user',
  })
  @IsNotEmpty()
  @IsEmail()
  referrerEmail: string;

  @ApiProperty({
    example: 'Social Media',
    description: 'Discovery method',
  })
  discoveryMethod: string;
  
}
