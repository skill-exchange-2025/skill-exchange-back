import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";
import { AttachmentDto } from "./Attachment.dto";

// create-private-message.dto.ts
export class CreatePrivateMessageDto {
    // @IsNotEmpty()
    @IsOptional()
    @IsString()
    content: string;
  
    @IsNotEmpty()
    recipientId: string;

    @IsString()
    @IsOptional() // Make it optional since not all messages are replies
    replyTo?: string;

    @IsObject()
    @IsOptional()
    attachment?: AttachmentDto;
  }
  export class CreateVoiceMessageDto {
    @IsNotEmpty()
    @IsString()
    audioUrl: string;  // URL where the audio file is stored

    @IsNotEmpty()
    @IsNumber()
    @Min(0.01)
    duration: number;  

    @IsNotEmpty()
    recipientId: string;

    @IsOptional()
    @IsString()
    content?: string = '';
}
  
  // edit-private-message.dto.ts
  export class EditPrivateMessageDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  }