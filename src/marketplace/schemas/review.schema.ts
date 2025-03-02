// src/marketplace/schemas/review.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Transaction } from './transaction.schema';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  reviewer: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  reviewee: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction', required: true })
  transaction: Transaction;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);