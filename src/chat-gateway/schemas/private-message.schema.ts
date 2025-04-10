// src/chat-gateway/schemas/private-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PrivateMessageDocument = PrivateMessage & Document;

@Schema({ timestamps: true })
export class PrivateMessage {
  @Prop({ required: true })
  sender: string;  // User ID of the sender

  @Prop({ required: true })
  recipient: string;  // User ID of the recipient

  @Prop({ required: true, maxlength: 2000 })
  content: string;  // Content of the private message

  @Prop({ type: Boolean, default: false })
  isRead: boolean;  // Flag to mark if the message has been read
}

export const PrivateMessageSchema = SchemaFactory.createForClass(PrivateMessage);
