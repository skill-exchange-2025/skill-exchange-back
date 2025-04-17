import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from './chat.schema';
import { CreateMessageDto } from './create-message.dto';

@Injectable()
export class ChatService {
  constructor(@InjectModel(Chat.name) private chatModel: Model<Chat>) {}

  // Save a new message to the database
  async saveMessage(createMessageDto: CreateMessageDto): Promise<Chat> {
    const newMessage = new this.chatModel(createMessageDto);
    return newMessage.save();
  }

  // Retrieve messages by conversation ID (sender and receiver)
  async getMessages(conversationId: string): Promise<Chat[]> {
    return this.chatModel
      .find({
        $or: [
          { sender: conversationId.split('-')[0], receiver: conversationId.split('-')[1] },
          { sender: conversationId.split('-')[1], receiver: conversationId.split('-')[0] },
        ],
      })
      .sort({ createdAt: 1 }); // Sort by createdAt to get messages in the correct order
  }
}
