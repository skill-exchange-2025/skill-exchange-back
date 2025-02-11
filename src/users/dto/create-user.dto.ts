// src/users/dto/create-user.dto.ts
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../auth/enums/role.enum';
import { Permission } from '../../auth/enums/permission.enum';
import { UserDesiredSkill } from '../schemas/user.desired.skill';
import { UserSkill } from '../schemas/user.skill.schema';

export class SkillDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  proficiencyLevel: string;
}

export class DesiredSkillDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  desiredProficiencyLevel: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, number/special character',
  })
  password: string;

  @ApiProperty({ type: [UserSkill], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserSkill)
  skills?: UserSkill[];

  @ApiProperty({ type: [UserDesiredSkill], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDesiredSkill)
  desiredSkills?: UserDesiredSkill[];

  @ApiProperty({ enum: Role, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @ApiProperty({ enum: Permission, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionGroups?: string[];
}
