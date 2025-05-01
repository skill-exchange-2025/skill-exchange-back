import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define the Reaction class with the necessary properties
@Schema()
class Reaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['❤️', '👍', '😊', '😂', '😮'] })
  type: string;
}

// Define the PrivateMessage schema with reactions as an array of Reaction objects
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

  // Define reactions as an array of Reaction objects
  @Prop({ type: [Reaction], default: [] })
  reactions: Reaction[];

  
  @Prop({ type: String })
  audioUrl?: string;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Boolean, default: false })
  isVoiceMessage: boolean;

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
