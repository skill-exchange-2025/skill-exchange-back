import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ example: 'Jhon doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: string[] | undefined;

  @ApiProperty({ enum: Permission, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  constructor(email: string, password: string, roles?: string[]) {
    this.email = email.trim().toLowerCase(); // Trim + lowercase email
    this.password = password.trim(); // Trim password
    this.roles = roles;
  }
}
