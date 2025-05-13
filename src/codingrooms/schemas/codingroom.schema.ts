// src/codingrooms/schemas/codingroom.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type CodingRoomDocument = CodingRoom & Document;

export enum ParticipantRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}

export class Participant {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({
    required: true,
    enum: Object.values(ParticipantRole),
    default: ParticipantRole.VIEWER,
  })
  role: string;
}

@Schema({ timestamps: true })
export class CodingRoom {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creator: User;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'archived'] })
  status: string;

  @Prop({ type: [{ user: { type: MongooseSchema.Types.ObjectId, ref: 'User' }, role: String }] })
  participants: Participant[];

  @Prop({ default: '' })
  currentCode: string;

  @Prop({ default: 'javascript' })
  language: string;

  @Prop({ default: 'vs-dark' })
  theme: string;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const CodingRoomSchema = SchemaFactory.createForClass(CodingRoom);
