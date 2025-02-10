import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  PermissionGroup,
  PermissionGroupSchema,
} from '../auth/schemas/permission-group.schema';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }, // Register User schema
      { name: PermissionGroup.name, schema: PermissionGroupSchema },
    ]),
    forwardRef(() => AuthModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
