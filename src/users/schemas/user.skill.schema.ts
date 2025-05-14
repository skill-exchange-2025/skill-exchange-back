import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserSkillDocument = UserSkill & Document;

@Schema()
export class UserSkill {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  proficiencyLevel: string;
}

export const UserSkillSchema = SchemaFactory.createForClass(UserSkill);
