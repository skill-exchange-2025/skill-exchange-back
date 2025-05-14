// src/messaging/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Channel } from './channel.schema';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  sender: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Channel', required: true })
  channel: Channel;

  @Prop({ maxlength: 2000, index: true })
  content: string;

  @Prop({
    type: {
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
      path: String,
      isPending: Boolean,
    },
  })
  attachment: {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
    isPending?: boolean;
  };

  @Prop({ type: Map, of: [String] })
  reactions: Map<string, string[]>;

  @Prop({ type: Boolean, default: false })
  hasUrlPreview: boolean;

  @Prop({ type: Object })
  urlPreview: {
    url: string;
    title: string;
    description: string;
    image: string;
  };

  @Prop({ type: String, index: true })
  clientMessageId: string;

  // Reply functionality fields
  @Prop({ type: Boolean, default: false })
  isReply: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  parentMessage: Message;

  @Prop({ type: Object })
  replyPreview: {
    content: string;
    sender: string;
    senderName: string;
  };

  @Prop({ type: Number, default: 0 })
  replyCount: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Add text index for search functionality
MessageSchema.index({ content: 'text' });

// Add custom validator to ensure either content or attachment is present
MessageSchema.pre('validate', function (next) {
  if ((!this.content || this.content.trim() === '') && !this.attachment) {
    this.invalidate('content', 'Either content or attachment must be provided');
  }
  next();
});
