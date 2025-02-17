// profile.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { UsersModule } from '../users/users.module'; // Add this import

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema }
    ]),
    UsersModule, // Add this line to import UsersModule
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}