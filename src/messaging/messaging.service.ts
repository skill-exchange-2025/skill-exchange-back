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
import * as cheerio from 'cheerio';
import axios from 'axios';

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

    // Ensure content exists (even if empty)
    if (!createMessageDto.content) {
      createMessageDto.content = '';
    }

    const message = await this.messageModel.create({
      sender: userId,
      ...createMessageDto,
    });

    // Format message content if it's not empty
    if (createMessageDto.content && createMessageDto.content.trim() !== '') {
      message.content = this.formatMessageContent(createMessageDto.content);

      // Handle URL previews
      if (this.containsUrl(createMessageDto.content)) {
        const urlPreview = await this.generateUrlPreview(
          createMessageDto.content
        );
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

    // Initialize reactions as a Map if it doesn't exist
    if (!message.reactions) {
      message.reactions = new Map();
    }

    // Get or create the array for this emoji
    let users = message.reactions.get(emoji) || [];

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
    content = content.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Convert emojis to images (if you have an emoji library)
    // content = emoji.replace(content);

    // Convert markdown to HTML (if you want to support markdown)
    // content = marked(content);

    return content;
  }

  async joinChannel(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is already in the channel
    const userExists =
      channel.members &&
      channel.members.some((member) => member.toString() === userId);

    if (userExists) {
      throw new BadRequestException('User is already in this channel');
    }

    // Add user to members
    if (!channel.members) {
      channel.members = [];
    }

    // Add user reference to the channel
    channel.members.push(userId as any); // Cast to any to bypass type checking
    await channel.save();

    return channel;
  }

  async leaveChannel(
    channelId: string,
    userId: string
  ): Promise<{ message: string }> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is in the channel
    const userExists =
      channel.members &&
      channel.members.some((member) => member.toString() === userId);

    if (!userExists) {
      throw new BadRequestException('User is not in this channel');
    }

    // Remove user from members
    channel.members = channel.members.filter(
      (member) => member.toString() !== userId
    );
    await channel.save();

    return { message: 'Successfully left the channel' };
  }

  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<{ message: string }> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is the sender of the message
    if (message.sender.toString() !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await message.deleteOne();

    return { message: 'Message deleted successfully' };
  }

  async getAllChannels(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ channels: Channel[]; total: number }> {
    const skip = (page - 1) * limit;

    // Find all channels that are not archived
    // You could add more filters here as needed
    const query = { isArchived: { $ne: true } };

    const [channels, total] = await Promise.all([
      this.channelModel
        .find(query)
        .sort({ updatedAt: -1 }) // Most recently active channels first
        .skip(skip)
        .limit(limit)
        .populate('members', 'name email username profileImage') // Populate member details
        .exec(),
      this.channelModel.countDocuments(query),
    ]);

    // Add a flag to indicate if the user is a member of each channel
    const enhancedChannels = channels.map((channel) => {
      // Check if the current user is a member of this channel
      let isMember = false;

      if (channel.members && Array.isArray(channel.members)) {
        isMember = channel.members.some((member: any) => {
          if (member._id) {
            return member._id.toString() === userId;
          }
          return member.toString() === userId;
        });
      }

      // Convert to plain object to add the new property
      const channelObj = channel.toObject();
      (channelObj as any).isMember = isMember;

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

    // Return array of member objects
    return channel.members || [];
  }
}
