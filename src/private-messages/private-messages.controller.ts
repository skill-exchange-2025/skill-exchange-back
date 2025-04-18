import { Controller, Post, Body, Get, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivateMessagesService } from './private-messages.service';
import { CreatePrivateMessageDto, EditPrivateMessageDto } from './private-message.dto';
import { CurrentUser } from 'src/auth/decorators/user.decorator';

@Controller('private-messages')
@UseGuards(JwtAuthGuard)
export class PrivateMessagesController {
  constructor(private readonly privateMessagesService: PrivateMessagesService) {}

  @Post()
  async createMessage(
    @CurrentUser() user: any,
    @Body() createMessageDto: CreatePrivateMessageDto,
  ) {
    return this.privateMessagesService.createMessage(user.id, createMessageDto);
  }

  @Get('with/:recipientId')
  async getMessagesWith(
    @CurrentUser() user: any,
    @Param('recipientId') recipientId: string,
  ) {
    return this.privateMessagesService.getMessagesBetweenUsers(user.id, recipientId);
  }

  @Delete(':messageId')
  async deleteMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
  ) {
    return this.privateMessagesService.deleteMessage(user.id, messageId);
  }

  @Put(':messageId')
  async editMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
    @Body() editMessageDto: EditPrivateMessageDto,
  ) {
    return this.privateMessagesService.editMessage(user.id, messageId, editMessageDto);
  }
}