import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FriendRequest, FriendRequestDocument } from './friend-request.schema';

@Injectable()
export class FriendRequestService {
  constructor(
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async getFriendRequests(userId: string) {
    return this.friendRequestModel
      .find({
        $or: [
          { sender: userId, status: 'pending' },
          { recipient: userId, status: 'pending' },
        ],
      })
      .populate('sender recipient', 'name email phone')
      .exec();
  }

  async create(senderId: string, email: string) {
    // Find recipient by email
    const recipient = await this.userModel.findOne({ email }).exec();
    if (!recipient) {
      throw new NotFoundException('User not found');
    }

    if ((recipient._id as Types.ObjectId).toString() === senderId.toString()) {
            throw new BadRequestException('Cannot send friend request to yourself');
    }
    

    // Check if friend request already exists
    const existingRequest = await this.friendRequestModel.findOne({
      $or: [
        { sender: senderId, recipient: recipient._id, status: 'pending' },
        { sender: recipient._id, recipient: senderId, status: 'pending' },
      ],
    });

    if (existingRequest) {
      throw new BadRequestException('Friend request already exists');
    }

    const friendRequest = new this.friendRequestModel({
      sender: senderId,
      recipient: recipient._id,
    });

    return (await friendRequest.save()).populate('sender recipient', 'name email phone');
  }

  async accept(requestId: string, userId: string) {
    const friendRequest = await this.friendRequestModel
      .findOne({
        _id:  new Types.ObjectId(requestId),
        recipient: new Types.ObjectId(userId),
        status: 'pending',
      })
      .populate('sender recipient', 'name email phone')
      .exec();

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    friendRequest.status = 'accepted';
    return friendRequest.save();
  }

  async reject(requestId: string, userId: string) {
    const friendRequest = await this.friendRequestModel
      .findOne({
        _id:  new Types.ObjectId(requestId),
        recipient: new Types.ObjectId(userId),
        status: 'pending',
      })
      .populate('sender recipient', 'name email phone')
      .exec();
      console.log('Friend request:', friendRequest);

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    friendRequest.status = 'rejected';
    return friendRequest.save();
  }

  async cancel(requestId: string, userId: string) {
    const friendRequest = await this.friendRequestModel
      .findOne({
        _id: requestId,
        sender: userId,
        status: 'pending',
      })
      .exec();

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    return this.friendRequestModel.deleteOne({ _id: requestId }).exec();
  }
  // In FriendRequestService
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendRequestModel.findOne({
      $or: [
        { 
          sender: new Types.ObjectId(userId1), 
          recipient: new Types.ObjectId(userId2), 
          status: 'accepted' 
        },
        { 
          sender: new Types.ObjectId(userId2), 
          recipient: new Types.ObjectId(userId1), 
          status: 'accepted' 
        }
      ]
    });
  
    console.log('Checking friendship between:', userId1, userId2);
    console.log('Found friendship:', friendship);
  
    return !!friendship;
  }
  
  
}