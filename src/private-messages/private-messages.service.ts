import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivateMessage } from './private-message.schema';
import { CreatePrivateMessageDto, EditPrivateMessageDto } from './private-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FriendRequestService } from 'src/friend-requests/friend-requests.service';
import { Types } from 'mongoose';

@Injectable()
export class PrivateMessagesService {
  constructor(
    @InjectModel(PrivateMessage.name)
    private privateMessageModel: Model<PrivateMessage>,
    private eventEmitter: EventEmitter2,
    private readonly friendRequestService: FriendRequestService,
  ) {}

  async createMessage(senderId: string, createMessageDto: CreatePrivateMessageDto) {
    const areFriends = await this.friendRequestService.areFriends(senderId, createMessageDto.recipientId);
  
    if (!areFriends) {
      throw new UnauthorizedException('You can only send messages to friends');
    }
  
    const newMessage = new this.privateMessageModel({
      content: createMessageDto.content,
      sender: senderId,
      recipient: createMessageDto.recipientId,
    });
  
    const savedMessage = await newMessage.save();
    this.eventEmitter.emit('message.created', savedMessage);
    return savedMessage;
  }
  
  

  async getMessagesBetweenUsers(userId: string, otherUserId: string) {
    return this.privateMessageModel
      .find({
        $or: [
          { sender: userId, recipient: otherUserId },
          { sender: otherUserId, recipient: userId },
        ],
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: 'asc' })
      .exec();
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