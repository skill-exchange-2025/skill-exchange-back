import { Module } from '@nestjs/common';
import { ChatGateway } from './chat-gateway';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './chat.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }])],
    providers: [ChatGateway,ChatService],
})
export class ChatModule {}
