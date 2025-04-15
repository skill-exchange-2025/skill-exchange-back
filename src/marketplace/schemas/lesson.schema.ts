// src/marketplace/schemas/lesson.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Listing } from './listing.schema';

export type LessonDocument = Lesson & Document;

export enum LessonType {
  LIVE = 'live',
  RECORDED = 'recorded',
  INTERACTIVE = 'interactive'
}

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  instructor: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Listing', required: true })
  listing: Listing;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, enum: LessonType, default: LessonType.RECORDED })
  type: LessonType;

  @Prop({ required: true })
  order: number; // For ordering lessons within a listing

  @Prop({ default: 'draft', enum: ['draft', 'published', 'archived'] })
  status: string;

  // Content fields
  @Prop({ type: String })
  textContent?: string;

  @Prop({ type: [String], default: [] })
  materials: string[];

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ type: String })
  videoUrl?: string;

  @Prop({ type: Boolean, default: false })
  isPreview: boolean;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Number })
  maxParticipants?: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);



