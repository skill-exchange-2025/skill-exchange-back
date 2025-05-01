import { Controller, Post, Body, Get, Param, Delete, Put, UseGuards, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivateMessagesService } from './private-messages.service';
import { CreatePrivateMessageDto, CreateVoiceMessageDto, EditPrivateMessageDto } from './private-message.dto';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/schemas/user.schema';
import { CreateReactionDto } from './create-reaction.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

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
  @Post(':messageId/reactions')
async addReaction(
  @CurrentUser() user: any,
  @Param('messageId') messageId: string,
  @Body() createReactionDto: CreateReactionDto
) {
  return await this.privateMessagesService.addReaction(
    user.id,
    messageId,
    createReactionDto.type
  );
}

@Patch('mark-as-read/:otherUserId')
  async markMessagesAsRead(
    @CurrentUser() user: any,
    @Param('otherUserId') otherUserId: string,
  ) {
    await this.privateMessagesService.markMessagesAsRead(user.id, otherUserId);
    return { message: 'Messages marked as read' };
  }
  @Post('voice')
async createVoiceMessage(
  @CurrentUser() user: any,
  @Body() createVoiceMessageDto: CreateVoiceMessageDto,
) {
  return this.privateMessagesService.createVoiceMessage(user.id, createVoiceMessageDto);
}

// @Post('upload-voice')
// @UseInterceptors(
//   FileInterceptor('audio', {
//     storage: diskStorage({
//       destination: './uploads',
//       filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, `${uniqueSuffix}-${file.originalname}`);
//       },
//     }),
//   })
// )
// async uploadVoiceMessage(
//   @UploadedFile() file: Express.Multer.File,
//   @CurrentUser() user: any,
// ) {
//   return this.privateMessagesService.uploadVoiceMessage(file);
// }
@Post('upload-voice')
@UseInterceptors(FileInterceptor('audio', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
}))
async uploadVoiceMessage(@UploadedFile() file: Express.Multer.File) {
  // Return the correct URL path
  return `/uploads/${file.filename}`;
}

@Delete(':messageId/reactions')
async removeReaction(
  @CurrentUser() user: any,
  @Param('messageId') messageId: string
) {
  return await this.privateMessagesService.removeReaction(
    user.id,
    messageId
  );
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