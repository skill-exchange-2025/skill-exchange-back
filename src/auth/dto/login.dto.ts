import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  constructor(email?: string, password?: string) {
    if (email) {
      this.email = email.trim().toLowerCase(); // Normalize on input
    }
    if (password) {
      this.password = password.trim();
    }
  }
}
