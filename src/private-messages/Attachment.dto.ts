import { IsNumber, IsString } from "class-validator";

export class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  originalname: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsString()
  path: string;
}