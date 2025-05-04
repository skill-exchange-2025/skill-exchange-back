// src/marketplace/schemas/wallet.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: User;

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ default: [] })
  transactions: [
    {
      amount: number;
      type: string; // 'deposit', 'withdrawal', 'purchase', 'sale'
      description: string;
      timestamp: Date;
      reference: string; // Transaction ID or listing ID
    },
  ];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
