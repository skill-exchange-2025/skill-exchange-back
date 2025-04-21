import {  IsNotEmpty, IsString } from "class-validator";

export class CreateFriendDto {
    // @IsEmail()
    @IsNotEmpty()
    @IsString()
    // email: string;
    name: string;

  }