import {  IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateFriendDto {
  // @IsNotEmpty()
  // @IsString()
  // name: string;

  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  }