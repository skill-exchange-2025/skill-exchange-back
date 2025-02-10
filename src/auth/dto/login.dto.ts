import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  constructor(email: string, password: string) {
    this.email = email.trim().toLowerCase(); // Normalize on input
    this.password = password.trim();
  }
}
