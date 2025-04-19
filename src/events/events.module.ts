import { Module } from '@nestjs/common';
import { MessagesEvents } from './messages.events';
import { PrivateMessagesModule } from '../private-messages/private-messages.module';

@Module({
  imports: [PrivateMessagesModule],
  providers: [MessagesEvents],
})
export class EventsModule {}