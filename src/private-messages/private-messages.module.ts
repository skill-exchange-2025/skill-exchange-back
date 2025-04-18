import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivateMessagesController } from './private-messages.controller';
import { PrivateMessagesService } from './private-messages.service';
import { PrivateMessagesGateway } from './private-messages.gateway';
import { PrivateMessage, PrivateMessageSchema } from './private-message.schema';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FriendRequestsModule } from 'src/friend-requests/friend-requests.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrivateMessage.name, schema: PrivateMessageSchema },
    ]),
    EventEmitterModule.forRoot(), // 👈 for root only once
    FriendRequestsModule,
  ],
  controllers: [PrivateMessagesController],
  providers: [PrivateMessagesService, PrivateMessagesGateway],
  exports: [PrivateMessagesService],
})
export class PrivateMessagesModule {}