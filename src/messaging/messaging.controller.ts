// src/messaging/messaging.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Message } from './schemas/message.schema';
import { Channel } from './schemas/channel.schema';

@ApiTags('messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('channels')
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({
    status: 201,
    description: 'Channel created successfully',
    type: Channel,
  })
  async createChannel(
    @Body() createChannelDto: CreateChannelDto
  ): Promise<Channel> {
    return this.messagingService.createChannel(createChannelDto);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
    type: Message,
  })
  async createMessage(
    @Request() req,
    @Body() createMessageDto: CreateMessageDto
  ): Promise<Message> {
    return this.messagingService.createMessage(req.user.id, createMessageDto);
  }

  @Post('messages/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file with message' })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: Message,
  })
  async uploadFile(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|pdf)$/i }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() createMessageDto: CreateMessageDto
  ): Promise<Message> {
    // Ensure content exists (even if empty)
    if (!createMessageDto.content) {
      createMessageDto.content = '';
    }

    createMessageDto.attachment = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    };
    return this.messagingService.createMessage(req.user.id, createMessageDto);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get channel messages' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [Message],
  })
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    return this.messagingService.getChannelMessages(channelId, page, limit);
  }

  @Get('messages/search')
  @ApiOperation({ summary: 'Search messages' })
  @ApiResponse({ status: 200, description: 'Messages found', type: [Message] })
  async searchMessages(
    @Query('query') query: string,
    @Query('channelId') channelId?: string
  ): Promise<Message[]> {
    return this.messagingService.searchMessages(query, channelId);
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiResponse({
    status: 200,
    description: 'Reaction added successfully',
    type: Message,
  })
  async addReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body() { emoji }: { emoji: string }
  ): Promise<Message> {
    return this.messagingService.addReaction(messageId, req.user.id, emoji);
  }

  @Delete('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
    type: Message,
  })
  async removeReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body() { emoji }: { emoji: string }
  ): Promise<Message> {
    return this.messagingService.removeReaction(messageId, req.user.id, emoji);
  }

  @Post('channels/:channelId/join')
  @ApiOperation({ summary: 'Join a channel' })
  @ApiResponse({
    status: 200,
    description: 'Joined channel successfully',
    type: Channel,
  })
  async joinChannel(@Request() req, @Param('channelId') channelId: string) {
    return this.messagingService.joinChannel(channelId, req.user.id);
  }

  @Post('channels/:channelId/leave')
  @ApiOperation({ summary: 'Leave a channel' })
  @ApiResponse({
    status: 200,
    description: 'Left channel successfully',
  })
  async leaveChannel(@Request() req, @Param('channelId') channelId: string) {
    return this.messagingService.leaveChannel(channelId, req.user.id);
  }

  @Post('messages/:messageId/delete')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
  })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List all channels' })
  @ApiResponse({
    status: 200,
    description: 'Channels retrieved successfully',
    type: [Channel],
  })
  async getAllChannels(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.messagingService.getAllChannels(req.user.id, page, limit);
  }

  @Get('channels/:channelId/members')
  @ApiOperation({ summary: 'Get channel members' })
  @ApiResponse({
    status: 200,
    description: 'Channel members retrieved successfully',
  })
  async getChannelMembers(@Param('channelId') channelId: string) {
    return this.messagingService.getChannelMembers(channelId);
  }
}
