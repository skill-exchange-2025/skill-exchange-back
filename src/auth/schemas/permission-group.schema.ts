import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Permission } from '../enums/permission.enum';

export type PermissionGroupDocument = PermissionGroup & Document;

@Schema({
  timestamps: true,
})
export class PermissionGroup {
  @Prop()
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], enum: Permission })
  permissions: Permission[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PermissionGroupSchema =
  SchemaFactory.createForClass(PermissionGroup);
