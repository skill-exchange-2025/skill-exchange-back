// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Role } from '../../auth/enums/role.enum';
import { Permission } from '../../auth/enums/permission.enum';
import { PermissionGroup } from '../../auth/schemas/permission-group.schema';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  // add the id field

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true, select: false })
  password: string;
  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop({ type: [String], enum: Permission, default: [] })
  permissions: Permission[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'PermissionGroup' }],
  })
  permissionGroups: PermissionGroup[];
}

export const UserSchema = SchemaFactory.createForClass(User);
