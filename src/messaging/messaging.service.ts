// src/messaging/messaging.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Define interface for the return type
interface ChannelWithMemberStatus extends Record<string, any> {
  isMember: boolean;
}

@Injectable()
export class MessagingService {
  private rateLimiter: RateLimiterMemory;

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>
  ) {
    this.rateLimiter = new RateLimiterMemory({
      points: 120,
      duration: 60,
    });
  }

  async createChannel(createChannelDto: CreateChannelDto): Promise<Channel> {
    return this.channelModel.create(createChannelDto);
  }

  async createMessage(
    userId: string,
    createMessageDto: CreateMessageDto
  ): Promise<Message> {
    try {
      await this.rateLimiter.consume(userId);
    } catch (error) {
      throw new BadRequestException('Rate limit exceeded');
    }

    // Extract channelId and properly map it to channel field
    const { channelId, content = '', ...rest } = createMessageDto;

    const message = await this.messageModel.create({
      sender: userId,
      channel: channelId,
      content,
      ...rest,
    });

    // Format message content if not empty
    if (content && content.trim() !== '') {
      message.content = this.formatMessageContent(content);

      // Handle URL previews
      if (this.containsUrl(content)) {
        const urlPreview = await this.generateUrlPreview(content);
        if (urlPreview) {
          message.hasUrlPreview = true;
          message.urlPreview = urlPreview;
        }
      }
    }

    return message.save();
  }

  async getChannelMessages(
    channelId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ channel: channelId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'name email username profileImage')
        .exec(),
      this.messageModel.countDocuments({ channel: channelId }),
    ]);

    return { messages, total };
  }

  async searchMessages(query: string, channelId?: string): Promise<Message[]> {
    const searchQuery: any = {
      $text: { $search: query },
    };

    if (channelId) {
      searchQuery.channel = channelId;
    }

    return this.messageModel
      .find(searchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .populate('sender', 'name email')
      .exec();
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Initialize reactions if needed
    if (!message.reactions) {
      message.reactions = new Map();
    }

    const users = message.reactions.get(emoji) || [];

    // Add user if not already present
    if (!users.includes(userId)) {
      users.push(userId);
      message.reactions.set(emoji, users);
    }

    return message.save();
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.reactions) {
      return message;
    }

    const users = message.reactions.get(emoji) || [];
    const updatedUsers = users.filter((id) => id !== userId);

    if (updatedUsers.length === 0) {
      message.reactions.delete(emoji);
    } else {
      message.reactions.set(emoji, updatedUsers);
    }

    return message.save();
  }

  private containsUrl(content: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(content);
  }

  private async generateUrlPreview(content: string): Promise<any> {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = content.match(urlRegex);
      if (!matches || matches.length === 0) {
        return null;
      }

      const url = matches[0];
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      return {
        url,
        title: $('title').text() || url,
        description:
          $('meta[name="description"]').attr('content') ||
          $('meta[property="og:description"]').attr('content') ||
          'No description available',
        image:
          $('meta[property="og:image"]').attr('content') ||
          $('meta[name="twitter:image"]').attr('content') ||
          null,
      };
    } catch (error) {
      return null;
    }
  }

  private formatMessageContent(content: string): string {
    // Convert URLs to clickable links
    return content.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  async joinChannel(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Return if user is already a member
    if (channel.members?.some((member) => member.toString() === userId)) {
      return channel;
    }

    // Add user to members
    if (!channel.members) {
      channel.members = [];
    }

    channel.members.push(userId as any);
    return channel.save();
  }

  async leaveChannel(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    channel.members = channel.members.filter(
      (member) => member.toString() !== userId
    );
    await channel.save();
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await message.deleteOne();
  }

  async getAllChannels(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ channels: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = { isArchived: { $ne: true } };

    const [channels, total] = await Promise.all([
      this.channelModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('members', 'name email username profileImage')
        .exec(),
      this.channelModel.countDocuments(query),
    ]);

    // Add isMember flag to each channel
    const enhancedChannels = channels.map((channel) => {
      const channelObj = channel.toObject();
      (channelObj as any).isMember = channel.members?.some((member: any) =>
        member._id
          ? member._id.toString() === userId
          : member.toString() === userId
      );
      return channelObj;
    });

    return { channels: enhancedChannels, total };
  }

  async getChannelMembers(channelId: string): Promise<any[]> {
    const channel = await this.channelModel
      .findById(channelId)
      .populate('members', 'name email username profileImage')
      .exec();

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel.members || [];
  }

  async populateMessage(message: MessageDocument): Promise<MessageDocument> {
    const populatedMessage = await this.messageModel
      .findById(message._id)
      .populate('sender', 'name email username profileImage')
      .exec();

    if (!populatedMessage) {
      throw new NotFoundException('Message not found');
    }

    return populatedMessage;
  }
}
