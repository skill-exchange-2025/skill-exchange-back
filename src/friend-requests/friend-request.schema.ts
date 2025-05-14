  import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
  import { Document, Types } from 'mongoose';

  export type FriendRequestDocument = FriendRequest & Document;

  @Schema({ timestamps: true })
  export class FriendRequest {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    sender: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    recipient: Types.ObjectId;

    @Prop({ 
      type: String, 
      enum: ['pending', 'accepted', 'rejected'], 
      default: 'pending' 
    })
    status: string;
  }

  export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);

  // Add compound index to prevent duplicate requests
  FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });