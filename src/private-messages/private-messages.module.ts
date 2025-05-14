import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrivateMessagesController } from './private-messages.controller';
import { PrivateMessagesService } from './private-messages.service';
import { PrivateMessagesGateway } from './private-messages.gateway';
import { PrivateMessage, PrivateMessageSchema } from './private-message.schema';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FriendRequestsModule } from 'src/friend-requests/friend-requests.module';
import { UsersModule } from 'src/users/users.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ProfileService } from 'src/profile/profile.service';
import { Profile, ProfileSchema } from 'src/profile/schemas/profile.schema';
import { UploadattachmentModule } from 'src/upload-attachment/upload-attachment.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = file.originalname.split('.').pop();
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: PrivateMessage.name, schema: PrivateMessageSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    EventEmitterModule.forRoot(),
    FriendRequestsModule,
    UsersModule,
    UploadattachmentModule,
    
  ],
  controllers: [PrivateMessagesController],
  providers: [PrivateMessagesService, PrivateMessagesGateway,ProfileService],
  exports: [PrivateMessagesService, PrivateMessagesGateway],
})
export class PrivateMessagesModule {}