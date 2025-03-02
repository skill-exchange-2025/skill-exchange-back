// src/marketplace/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  stripePaymentId: string;

  @Prop({ required: true, enum: ['succeeded', 'pending', 'failed'] })
  status: string;

  @Prop()
  description: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);