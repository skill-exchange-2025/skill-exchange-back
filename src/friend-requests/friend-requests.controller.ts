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
    // Access user ID from token
    return this.friendRequestService.create(req.user._id, email);
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

  

}