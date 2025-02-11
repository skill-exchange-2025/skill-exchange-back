import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  PermissionGroup,
  PermissionGroupSchema,
} from '../auth/schemas/permission-group.schema';
import {
  UserDesiredSkill,
  UserDesiredSkillSchema
} from './schemas/user.desired.skill';
import { AuthModule } from '../auth/auth.module';
import { UserSkill, UserSkillSchema } from './schemas/user.skill.schema'; // Import AuthModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }, // Register User schema
      { name: PermissionGroup.name, schema: PermissionGroupSchema },
      { name: UserSkill.name, schema: UserSkillSchema },
      { name: UserDesiredSkill.name, schema: UserDesiredSkillSchema },
    ]),
    forwardRef(() => AuthModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
