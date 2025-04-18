import { IsNotEmpty, IsString } from "class-validator";

// create-private-message.dto.ts
export class CreatePrivateMessageDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  
    @IsNotEmpty()
    recipientId: string;
  }
  
  // edit-private-message.dto.ts
  export class EditPrivateMessageDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  }