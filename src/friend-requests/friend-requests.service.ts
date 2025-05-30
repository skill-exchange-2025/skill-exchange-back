import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FriendRequest, FriendRequestDocument } from './friend-request.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FriendRequestService {
  constructor(
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async getFriendRequests(userId: string) {
    const requests = await this.friendRequestModel
      .find({
        recipient: userId,
        status: 'pending',
      })
      .populate('sender', 'name email phone')
      .exec();
  
    return requests.map((req) => ({
      _id: req._id,
      sender: {
        _id: (req.sender as any)._id,
        name: (req.sender as any).name,
        email: (req.sender as any).email,
        phone: (req.sender as any).phone,
      },
      status: req.status
    }));
  }
  
  // In FriendRequestService
  async getFriends(userId: string) {
    const requests = await this.friendRequestModel.find({
      $or: [
        { sender: new Types.ObjectId(userId) },
        { recipient: new Types.ObjectId(userId) }
      ],
      status: 'accepted'
    })
    .populate('sender', '_id email username firstName lastName')
    .populate('recipient', '_id email username firstName lastName');
  
    return requests.map(request => {
      const sender = request.sender as any;
      const recipient = request.recipient as any;
      const friend = sender._id.toString() === userId ? recipient : sender;
  
      return {
        _id: friend._id,
        email: friend.email,
        username: friend.username,
        firstName: friend.firstName,
        lastName: friend.lastName,
        friendRequestId: request._id,
        status: request.status,
      };
    });
  }
  
  
  async searchUsersByName(name: string, currentUserId: string) {
    // First, find all pending friend requests involving the current user
    const pendingRequests = await this.friendRequestModel.find({
      $or: [
        { sender: new Types.ObjectId(currentUserId), status: 'pending' },
        { recipient: new Types.ObjectId(currentUserId), status: 'pending' }
      ]
    });
  
    // Get the IDs of users involved in pending requests
    const userIdsWithPendingRequests: Types.ObjectId[] = pendingRequests.reduce((ids: Types.ObjectId[], request) => {
      if (request.sender.toString() !== currentUserId) {
        ids.push(request.sender);
      }
      if (request.recipient.toString() !== currentUserId) {
        ids.push(request.recipient);
      }
      return ids;
    }, []);
  
    // Find users excluding current user and users with pending requests
    const users = await this.userModel.find({
      name: { $regex: name, $options: 'i' },  // Case-insensitive search
      _id: { 
        $ne: new Types.ObjectId(currentUserId),  // Exclude current user
        $nin: userIdsWithPendingRequests  // Exclude users with pending requests
      }
    })
    .select('_id name email phone')
    .limit(5)
    .exec();
  
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    }));
  }





  async getSentFriendRequests(userId: string) {
    const requests = await this.friendRequestModel
      .find({
        sender: userId,
        status: 'pending',
      })
      .populate('recipient', 'name email phone')
      .exec();
  
    return requests.map((req) => ({
      _id: req._id,
      recipient: {
        _id: (req.recipient as any)._id,
        name: (req.recipient as any).name,
        email: (req.recipient as any).email,
        phone: (req.recipient as any).phone,
      },
      status: req.status
    }));
  }

  // async create(senderId: string, name: string) {
  //   const recipient = await this.userModel.findOne({ name }).exec();
  //   if (!recipient) {
  //     throw new NotFoundException('User not found');
  //   }

  //   if ((recipient._id as Types.ObjectId).toString() === senderId.toString()) {
  //           throw new BadRequestException('Cannot send friend request to yourself');
  //   }
    

  //   // Check if friend request already exists
  //   const existingRequest = await this.friendRequestModel.findOne({
  //     $or: [
  //       { sender: senderId, recipient: recipient._id, status: 'pending' },
  //       { sender: recipient._id, recipient: senderId, status: 'pending' },
  //     ],
  //   });

  //   if (existingRequest) {
  //     throw new BadRequestException('Friend request already exists');
  //   }

  //   const friendRequest = new this.friendRequestModel({
  //     sender: senderId,
  //     recipient: recipient._id,
  //   });

  //   return (await friendRequest.save()).populate('sender recipient', 'name email phone');
  // }
  async create(senderId: string, recipientEmail: string) {
    const recipient = await this.userModel.findOne({ email: recipientEmail }).exec();
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
    // Find the friend request and populate sender and recipient
    const friendRequest = await this.friendRequestModel
      .findOne({
        _id: new Types.ObjectId(requestId)
      })
      .populate('sender recipient', 'username email firstName lastName')
      .exec();
  
    // Check if friend request exists
    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }
  
    // Check if the request is already accepted
    if (friendRequest.status === 'accepted') {
      throw new BadRequestException('Friend request already accepted');
    }
  
    // Check if the user is the intended recipient
    if (friendRequest.recipient._id.toString() !== userId) {
      throw new BadRequestException('Not authorized to accept this friend request');
    }
  
    // Check if they are already friends
    const alreadyFriends = await this.areFriends(
      friendRequest.sender._id.toString(),
      friendRequest.recipient._id.toString()
    );
    
    if (alreadyFriends) {
      throw new BadRequestException('Users are already friends');
    }
  
    // Update the friend request status
    friendRequest.status = 'accepted';
    const updatedFriendRequest = await friendRequest.save();
  
    // Emit event for real-time updates
    this.eventEmitter.emit('friendRequest.accepted', {
      friendRequest: updatedFriendRequest,
      sender: friendRequest.sender,
      recipient: friendRequest.recipient
    });
  
    return updatedFriendRequest;
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
        _id: new Types.ObjectId(requestId),
        sender: new Types.ObjectId(userId),
        status: 'pending'
      })
      .exec();
  
    if (!friendRequest) {
      throw new NotFoundException('Pending friend request not found');
    }
  
    await this.friendRequestModel.deleteOne({ _id: new Types.ObjectId(requestId) }).exec();
    return { message: 'Friend request cancelled successfully' };
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
  // In your service
async checkRequestStatus(senderId: string, recipientId: string) {
  // Check if already friends
  const areFriends = await this.areFriends(senderId, recipientId);
  if (areFriends) {
    return { status: 'friends' };
  }

  // Check for pending requests in either direction
  const request = await this.friendRequestModel.findOne({
    $or: [
      { sender: new Types.ObjectId(senderId), recipient: new Types.ObjectId(recipientId) },
      { sender: new Types.ObjectId(recipientId), recipient: new Types.ObjectId(senderId) }
    ],
    status: 'pending'
  });

  if (!request) {
    return { status: 'none' };
  }

  return {
    status: request.sender.toString() === senderId ? 'request-sent' : 'request-received',
    requestId: request._id
  };
}
  

  
  
  
}