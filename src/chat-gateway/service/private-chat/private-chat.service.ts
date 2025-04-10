// src/chat-gateway/services/private-chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePrivateMessageDto } from 'src/chat-gateway/dto/create-private-message.dto';
import { PrivateMessage } from 'src/chat-gateway/schemas/private-message.schema';

@Injectable()
export class PrivateChatService {
  constructor(
    @InjectModel(PrivateMessage.name) private readonly privateMessageModel: Model<PrivateMessage>,
  ) {}

  // Handle sending a private message
  async sendPrivateMessage(createPrivateMessageDto: CreatePrivateMessageDto): Promise<PrivateMessage> {
    // Create and save the new private message to the database
    const createdMessage = new this.privateMessageModel(createPrivateMessageDto);
    return await createdMessage.save();
  }

  // Handle fetching private messages between two users
  async getPrivateMessages(senderId: string, recipientId: string): Promise<PrivateMessage[]> {
    // Retrieve the private messages between two users from the database
    return this.privateMessageModel
      .find({
        $or: [
          { sender: senderId, recipient: recipientId },
          { sender: recipientId, recipient: senderId },
        ],
      })
      .sort({ createdAt: 1 }) // Sort by creation time (ascending)
      .exec();
  }
}
