import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDesiredSkillDocument = UserDesiredSkill & Document;

@Schema()
export class UserDesiredSkill {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  desiredProficiencyLevel: string;
}

export const UserDesiredSkillSchema = SchemaFactory.createForClass(UserDesiredSkill);