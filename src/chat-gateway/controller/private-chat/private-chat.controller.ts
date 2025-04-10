import { Controller, Post, Body, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { CreatePrivateMessageDto } from 'src/chat-gateway/dto/create-private-message.dto';
import { PrivateMessage } from 'src/chat-gateway/schemas/private-message.schema';
import { PrivateChatService } from 'src/chat-gateway/service/private-chat/private-chat.service';
import { PrivateChatAuthGuard } from 'src/chat-gateway/guards/private-chat-auth.guard';  // Import the new guard

@ApiTags('Private Chat')
@Controller('privatechat')
export class PrivateChatController {
  constructor(private readonly privateChatService: PrivateChatService) {}

  // Endpoint to send a private message
  @Post('send')
  @UseGuards(PrivateChatAuthGuard)  // Use the custom guard here
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: PrivateMessage,
  })
  async sendPrivateMessage(
    @Body() createPrivateMessageDto: CreatePrivateMessageDto,
  ): Promise<PrivateMessage> {
    return this.privateChatService.sendPrivateMessage(createPrivateMessageDto);
  }

  // Endpoint to get private messages between two users
  @Get(':senderId/:recipientId')
  @UseGuards(PrivateChatAuthGuard)
  async getPrivateMessages(
    @Param('senderId') senderId: string,
    @Param('recipientId') recipientId: string,
    @Req() req: any // or Request if you're using types
  ): Promise<PrivateMessage[]> {
    const requesterId = req.user._id.toString(); // ensure it's a string
  
    if (requesterId !== senderId && requesterId !== recipientId) {
      throw new ForbiddenException('You are not allowed to view these messages');
    }
  
    return this.privateChatService.getPrivateMessages(senderId, recipientId);
  }
}
