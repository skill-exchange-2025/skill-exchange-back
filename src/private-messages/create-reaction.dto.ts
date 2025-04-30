export class CreateReactionDto {
    messageId: string;
    type: string;
  }
  
  // remove-reaction.dto.ts
  export class RemoveReactionDto {
    messageId: string;
  }