// src/marketplace/schemas/transaction.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Listing } from './listing.schema';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  buyer: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  seller: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Listing', required: true })
  listing: Listing;

  @Prop({ required: true })
  amount: number;

  @Prop({
    default: 'pending_payment',
    enum: [
      'pending_payment',
      'pending',
      'completed',
      'cancelled',
      'refunded',
      'failed',
    ],
  })
  status: string;

  @Prop()
  completedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
