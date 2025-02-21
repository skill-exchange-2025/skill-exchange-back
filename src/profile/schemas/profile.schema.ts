import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: User;

  @Prop({ type: String })
  avatarUrl: string;

  @Prop({ type: String })
  bio: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String })
  location: string;

  @Prop({ type: [String] })
  socialLinks: string[];

  @Prop({ type: String })
  profession: string;

  @Prop({ type: [String] })
  interests: string[];

  @Prop({ type: Date })
  birthDate: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
