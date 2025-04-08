// src/marketplace/schemas/listing.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ListingDocument = Listing & Document;

export enum ListingType {
  COURSE = 'course',
  ONLINE_COURSE = 'onlineCourse',
}

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

  @Prop({
    required: true,
    enum: Object.values(ListingType),
    default: ListingType.COURSE,
  })
  type: string;

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

  // Course specific fields (static content)
  @Prop({ type: [String], default: [] })
  contentUrls?: string[]; // URLs to PDFs, videos, or other static content

  @Prop({ type: String, required: false })
  contentDescription?: string;

  // Online course specific fields (interactive/live sessions)
  @Prop({ type: String, required: false })
  location?: string;

  @Prop({ type: Number, required: false })
  maxStudents?: number;

  @Prop({ type: String, required: false })
  startDate?: string;

  @Prop({ type: String, required: false })
  endDate?: string;

  @Prop({ type: String, required: false })
  videoUrl?: string;

  @Prop({ type: [String], default: [] })
  materials?: string[];

  @Prop({ type: Number, required: false })
  durationHours?: number;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
