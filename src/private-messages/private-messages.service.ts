import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivateMessage } from './private-message.schema';
import { CreatePrivateMessageDto, CreateVoiceMessageDto, EditPrivateMessageDto } from './private-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FriendRequestService } from 'src/friend-requests/friend-requests.service';
import { Types } from 'mongoose';
import { Profile, ProfileDocument } from 'src/profile/schemas/profile.schema';

@Injectable()
export class PrivateMessagesService {
  constructor(
    @InjectModel(PrivateMessage.name) private privateMessageModel: Model<PrivateMessage>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    // private privateMessageModel: Model<PrivateMessage>,
    private eventEmitter: EventEmitter2,
    private readonly friendRequestService: FriendRequestService,
  ) {}

  async createMessage(senderId: string, createMessageDto: CreatePrivateMessageDto) {
    const areFriends = await this.friendRequestService.areFriends(
      senderId, 
      createMessageDto.recipientId
    );
  
    if (!areFriends) {
      throw new UnauthorizedException('You can only send messages to friends');
    }
  
    let replyToData: { content: string; sender: Types.ObjectId } | undefined;
  
    if (createMessageDto.replyTo) {
      const replyToMessage = await this.privateMessageModel.findById(createMessageDto.replyTo)
        .populate('sender', '_id name')
        .exec();
          
      if (!replyToMessage) {
        throw new NotFoundException('Reply message not found');
      }
  
      replyToData = {
        content: replyToMessage.content,
        sender: replyToMessage.sender //na7it l ._id
      };
    }
  
    const newMessage = new this.privateMessageModel({
      content: createMessageDto.content,
      sender: senderId,
      recipient: createMessageDto.recipientId,
      replyTo: replyToData,
      attachment: createMessageDto.attachment,
    });
  
    // Save first
    const savedMessage = await newMessage.save();
    
    // Then populate the saved message
    const populatedMessage = await this.privateMessageModel
      .findById(savedMessage._id)
      .populate('sender', '_id name')
      .populate('recipient', '_id name')
      .populate('replyTo.sender', '_id name')
      .exec();
  
    this.eventEmitter.emit('message.created', populatedMessage);
    return populatedMessage;
  }
  
  async addReaction(userId: string, messageId: string, type: string) {
    const message = await this.privateMessageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
  
    // Check if user already reacted
    const existingReaction = message.reactions.find(
      reaction => reaction.user.toString() === userId
    );
  
    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = type;
    } else {
      // Add new reaction
      message.reactions.push({ user: new Types.ObjectId(userId), type });
    }
  
    const updatedMessage = await message.save();
    return updatedMessage;
  }
  
  async removeReaction(userId: string, messageId: string) {
    const message = await this.privateMessageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
  
    message.reactions = message.reactions.filter(
      reaction => reaction.user.toString() !== userId
    );
  
    const updatedMessage = await message.save();
    return updatedMessage;
  }



  async markMessagesAsRead(userId: string, otherUserId: string) {
    await this.privateMessageModel.updateMany(
      {
        sender: otherUserId,
        recipient: userId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  }




  
  // async getMessagesBetweenUsers(userId: string, otherUserId: string) {
  //   return this.privateMessageModel
  //     .find({
  //       $or: [
  //         { sender: userId, recipient: otherUserId },
  //         { sender: otherUserId, recipient: userId },
  //       ],
  //       isDeleted: { $ne: true },
  //     })
  //     .populate('sender', '_id name') 
  //   .populate('recipient', '_id name') 
  //   .populate('replyTo.sender', '_id name')
  //     .sort({ createdAt: 'asc' })
  //     .exec();
      
  // }
  async getMessagesBetweenUsers(userId: string, otherUserId: string) {
    const messages = await this.privateMessageModel
      .find({
        $or: [
          { sender: userId, recipient: otherUserId },
          { sender: otherUserId, recipient: userId },
        ],
        isDeleted: { $ne: true },
      })
      .populate('sender', '_id name')
      .populate('recipient', '_id name')
      .populate('replyTo.sender', '_id name')
      .sort({ createdAt: 'asc' })
      .exec();
  
    // Get unique sender IDs
    const senderIds = [...new Set(messages.map(msg => msg.sender._id.toString()))];
  
    // Get profiles for those senders
    const profiles = await this.profileModel.find({ userId: { $in: senderIds } });
  
    // Map userId => avatarUrl
    const avatarMap = new Map<string, string>();
    profiles.forEach(profile => {
      avatarMap.set(profile.userId.toString(), profile.avatarUrl);
    });
  
    // Attach avatarUrl to each message
    const enrichedMessages = messages.map((msg: any) => {
      const msgObj = msg.toObject(); // Convert full message to plain object
    
      const sender = msgObj.sender || {};
      const senderId = sender._id?.toString?.() || msg.sender?.toString?.();
    
      const avatarUrl = avatarMap.get(senderId) || null;
    
      return {
        ...msgObj,
        sender: {
          ...sender,
          avatarUrl,
        },
      };
    });
    
  
    return enrichedMessages;
  }
  

 // In private-messages.service.ts
 async createVoiceMessage(senderId: string, createVoiceMessageDto: CreateVoiceMessageDto) {
  const areFriends = await this.friendRequestService.areFriends(
    senderId, 
    createVoiceMessageDto.recipientId
  );

  if (!areFriends) {
    throw new UnauthorizedException('You can only send messages to friends');
  }

  const newVoiceMessage = new this.privateMessageModel({
    sender: senderId,
    recipient: createVoiceMessageDto.recipientId,
    audioUrl: createVoiceMessageDto.audioUrl,
    duration: createVoiceMessageDto.duration,
    isVoiceMessage: true,
    content: 'Voice Message', // Add a default content for voice messages
    createdAt: new Date()
  });

  const savedMessage = await newVoiceMessage.save();
  
  const populatedMessage = await this.privateMessageModel
    .findById(savedMessage._id)
    .populate('sender', '_id name')
    .populate('recipient', '_id name')
    .exec();

  this.eventEmitter.emit('message.created', populatedMessage);
  return populatedMessage;
}

async uploadVoiceMessage(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  // Generate a URL for the uploaded file
  const audioUrl = `/uploads/${file.filename}`;

  return { 
    audioUrl,
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  };
}




  

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.privateMessageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.toString() !== userId) {
      throw new UnauthorizedException('Cannot delete other users messages');
    }
    
    await message.updateOne({ isDeleted: true });
    this.eventEmitter.emit('message.deleted', messageId);
    return { messageId };
  }

  async editMessage(userId: string, messageId: string, editMessageDto: EditPrivateMessageDto) {
    const message = await this.privateMessageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.toString() !== userId) {
      throw new UnauthorizedException('Cannot edit other users messages');
    }

    const updatedMessage = await message.updateOne({
      content: editMessageDto.content,
    });
    
    this.eventEmitter.emit('message.updated', { messageId, content: editMessageDto.content });
    return updatedMessage;
  }

 
  
  
}