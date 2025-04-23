import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class WheelSpin {
  _id: Types.ObjectId; // Add this line to explicitly define _id

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  credits: number;

  @Prop({ required: true })
  spinTime: Date;
}

export type WheelSpinDocument = WheelSpin & Document;
export const WheelSpinSchema = SchemaFactory.createForClass(WheelSpin);
