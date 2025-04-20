import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PrivateMessage extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  
  @Prop({
    type: {
      content: String,
      sender: { type: Types.ObjectId, ref: 'User' }
    },
    required: false
  })
  replyTo?: {
    content: string;
    sender: Types.ObjectId;
  };

  @Prop({ default: false })
  isDeleted: boolean;
}

export const PrivateMessageSchema = SchemaFactory.createForClass(PrivateMessage);