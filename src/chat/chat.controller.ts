import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateMessageDto } from './create-message.dto';


@Controller('chat')
@UseGuards(AuthGuard) // Ensure that only authenticated users can access these routes
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Endpoint to get messages between users
  @Get('messages/:conversationId')
  async getMessages(@Param('conversationId') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }

  // Endpoint to send a message
  @Post('send-message')
  async sendMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.chatService.saveMessage(createMessageDto);
  }
}
