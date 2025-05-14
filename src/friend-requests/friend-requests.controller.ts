import {
    Body,
    Controller,
    Delete,
    Get,
    Request,
    Param,
    Patch,
    Post,
    UseGuards,
    Query,
  } from '@nestjs/common';
  import { FriendRequestService } from './friend-requests.service';
  import { CreateFriendDto } from './CreateFriend.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
@Controller('friend-requests')
@UseGuards(JwtAuthGuard)
export class FriendRequestController {
  constructor(private readonly friendRequestService: FriendRequestService) {}

  @Get()
  async getFriendRequests(@Request() req) {
    // Access user ID from token
    return this.friendRequestService.getFriendRequests(req.user._id);
  }

@Post()
async createFriendRequest(
  @Request() req,
  @Body() { email }: CreateFriendDto, 
) {
  return this.friendRequestService.create(req.user._id, email);
}
//   @Post()
// async createFriendRequest(
//   @Request() req,
//   @Body() createFriendDto: CreateFriendDto,
// ) {
//   return this.friendRequestService.create(req.user._id, createFriendDto);
// }
@Get('sent')
async getSentFriendRequests(@Request() req) {
  return this.friendRequestService.getSentFriendRequests(req.user._id);
}

  

  @Patch(':id/accept')
  async acceptFriendRequest(
    @Request() req,
    @Param('id') requestId: string,
  ) {
    // Access user ID from token
    return this.friendRequestService.accept(requestId, req.user._id.toString());
  }
  @Get('friends')
  async getFriends(@Request() req) {
    return this.friendRequestService.getFriends(req.user._id.toString());
  }
  @Get('search')
  async searchUsers(@Request() req, @Query('name') name: string) {
    return this.friendRequestService.searchUsersByName(name, req.user._id);
  }

  @Patch(':id/reject')
  async rejectFriendRequest(
    @Request() req,
    @Param('id') requestId: string,
  ) {
    // Access user ID from token
    return this.friendRequestService.reject(requestId, req.user._id.toString());
  }

  @Delete(':id')
  async cancelFriendRequest(
    @Request() req,
    @Param('id') requestId: string,
  ) {
    // Access user ID from token
    return this.friendRequestService.cancel(requestId, req.user._id.toString());
  }
@Get('status/:recipientId')
async checkFriendRequestStatus(
  @Request() req,
  @Param('recipientId') recipientId: string
) {
  const senderId = req.user._id; 
  return this.friendRequestService.checkRequestStatus(senderId, recipientId);
}
  

  

}