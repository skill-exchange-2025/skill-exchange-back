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
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // Increase to 25MB
          new FileTypeValidator({
            fileType:
              /(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i,
          }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() createMessageDto: CreateMessageDto
  ): Promise<Message> {
    console.log('File upload received:', {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });

    console.log('Request body:', createMessageDto);

    // Ensure content exists (even if empty)
    if (!createMessageDto.content) {
      createMessageDto.content = '';
    }

    // Make sure we have a channelId
    if (!createMessageDto.channelId) {
      // Try to get channelId from the 'channel' field (which might be used in the FormData)
      const channelId = createMessageDto['channel'];
      if (channelId) {
        createMessageDto.channelId = channelId;
        console.log(`Found channelId in 'channel' field: ${channelId}`);
      } else {
        console.error('ERROR: No channelId provided in the request');
        throw new Error('Channel ID is required');
      }
    }

    // Extract clientMessageId if provided in the request body
    const clientMessageId =
      createMessageDto['clientMessageId'] ||
      `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    console.log('Using clientMessageId:', clientMessageId);

    // Create attachment data
    createMessageDto.attachment = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      isPending: false, // Not pending, this is the actual file
    };

    // Add clientMessageId to link with any socket message
    createMessageDto.clientMessageId = clientMessageId;

    console.log('Creating message with attachment:', {
      clientMessageId,
      channelId: createMessageDto.channelId,
      content: createMessageDto.content ? '[has content]' : '[empty]',
      attachment: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
      },
    });

    const message = await this.messagingService.createMessage(
      req.user.id,
      createMessageDto
    );

    console.log('File upload message created:', {
      messageId: message['_id'],
      clientMessageId: message['clientMessageId'],
      channelId: message['channel'],
      attachment: {
        filename: message.attachment?.filename,
        originalname: message.attachment?.originalname,
        isPending: message.attachment?.isPending || false,
      },
    });

    return message;
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
    try {
      console.log(
        `REST API: Deleting message ${messageId} by user ${req.user.id}`
      );
      await this.messagingService.deleteMessage(messageId, req.user.id);
      console.log(`REST API: Successfully deleted message ${messageId}`);
      return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
      console.error(
        `REST API: Error deleting message ${messageId}:`,
        error.message
      );
      // Don't expose full error details to the client
      throw error;
    }
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

  @Get('messages/:messageId/replies')
  @ApiOperation({ summary: 'Get replies to a message' })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
    type: [Message],
  })
  async getMessageReplies(
    @Param('messageId') messageId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    return this.messagingService.getMessageReplies(messageId, page, limit);
  }
}
