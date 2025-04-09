import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { JwtModule } from '@nestjs/jwt';
import { PrivateMessage, PrivateMessageSchema } from 'src/chat-gateway/schemas/private-message.schema';
import { PrivateChatController } from 'src/chat-gateway/controller/private-chat/private-chat.controller';
import { PrivateChatService } from 'src/chat-gateway/service/private-chat/private-chat.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
          { name: PrivateMessage.name, schema: PrivateMessageSchema },
        ]),
        forwardRef(() => AuthModule), // ✅ fixes circular dependency
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'your-secret-key',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      
  controllers: [PrivateChatController],
  providers: [PrivateChatService],
})
export class PrivateChatModule {}
