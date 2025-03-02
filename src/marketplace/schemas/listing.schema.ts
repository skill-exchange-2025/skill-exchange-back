// src/marketplace/schemas/listing.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ListingDocument = Listing & Document;

@Schema({ timestamps: true })
export class Listing {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  seller: User;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  skillName: string;

  @Prop({ required: true })
  proficiencyLevel: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'active', enum: ['active', 'sold', 'inactive'] })
  status: string;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: [] })
  imagesUrl: string[];
}

export const ListingSchema = SchemaFactory.createForClass(Listing);