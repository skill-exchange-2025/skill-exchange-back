import { IsNotEmpty, IsOptional, IsString } from "class-validator";

// create-private-message.dto.ts
export class CreatePrivateMessageDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  
    @IsNotEmpty()
    recipientId: string;

    @IsString()
    @IsOptional() // Make it optional since not all messages are replies
    replyTo?: string;
  }
  
  // edit-private-message.dto.ts
  export class EditPrivateMessageDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  }