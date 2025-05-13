// src/messaging/messaging.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { User, UserDocument } from '../users/schemas/user.schema';

// Define interface for the return type
interface ChannelWithMemberStatus extends Record<string, any> {
  isMember: boolean;
}

@Injectable()
export class MessagingService {
  private rateLimiter: RateLimiterMemory;

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
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
    const {
      channelId,
      content = '',
      clientMessageId,
      parentMessageId,
      replyPreview,
      isReply = false,
      ...rest
    } = createMessageDto;

    console.log(
      `Creating message with clientMessageId: ${clientMessageId}`,
      rest.attachment
        ? `Has attachment (isPending: ${rest.attachment.isPending})`
        : 'No attachment',
      isReply ? `Is a reply to message: ${parentMessageId}` : 'Not a reply'
    );

    // Check if there's an existing message with this clientMessageId to avoid duplicates
    if (clientMessageId) {
      const existingMessage = await this.messageModel.findOne({
        clientMessageId: clientMessageId,
        channel: channelId,
        sender: userId,
      });

      if (existingMessage) {
        console.log(
          `Found existing message with clientMessageId: ${clientMessageId}`
        );

        // If the message exists but has a pending attachment, and now we have the real attachment
        if (
          existingMessage.attachment?.isPending &&
          rest.attachment &&
          !rest.attachment.isPending
        ) {
          console.log(
            `Updating pending attachment with real one for message: ${existingMessage._id}`
          );
          // Update the pending attachment with the real one
          existingMessage.attachment = rest.attachment;
          await existingMessage.save();
          return existingMessage;
        }

        // Return existing message to avoid duplication
        console.log(
          `Returning existing message to avoid duplication: ${existingMessage._id}`
        );
        return existingMessage;
      }
    }

    console.log(
      `Creating new message for user ${userId} in channel ${channelId}`
    );

    // Create the message document
    const messageData: any = {
      sender: userId,
      channel: channelId,
      content,
      clientMessageId, // Store the clientMessageId for future reference
      ...rest,
    };

    // Handle reply-specific fields
    if (isReply && parentMessageId) {
      // Verify the parent message exists
      const parentMessage = await this.messageModel.findById(parentMessageId);
      if (!parentMessage) {
        throw new NotFoundException(
          `Parent message with ID ${parentMessageId} not found`
        );
      }

      // Make sure the parent message is in the same channel
      if (parentMessage.channel.toString() !== channelId) {
        throw new BadRequestException(
          'Parent message must be in the same channel'
        );
      }

      messageData.isReply = true;
      messageData.parentMessage = parentMessageId;

      // Add reply preview if provided, or generate one from the parent message
      if (replyPreview) {
        messageData.replyPreview = replyPreview;
      } else {
        // Get parent message sender info
        const senderInfo = await this.getUserInfo(
          parentMessage.sender.toString()
        );

        // Create a preview of the parent message
        messageData.replyPreview = {
          content:
            parentMessage.content.substring(0, 100) +
            (parentMessage.content.length > 100 ? '...' : ''),
          sender: parentMessage.sender.toString(),
          senderName: senderInfo?.name || 'Unknown User',
        };
      }

      // Increment the reply count on the parent message
      parentMessage.replyCount = (parentMessage.replyCount || 0) + 1;
      await parentMessage.save();
    }

    const message = await this.messageModel.create(messageData);

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
    if (channel.members?.some((member) => !(member.toString() !== userId))) {
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
    try {
      // Validate messageId
      if (!messageId || !Types.ObjectId.isValid(messageId)) {
        throw new BadRequestException(
          `Invalid message ID format: ${messageId}`
        );
      }

      // Attempt to find the message
      const message = await this.messageModel.findById(messageId);
      if (!message) {
        throw new NotFoundException(`Message not found with ID: ${messageId}`);
      }

      // Validate that the user is the sender
      const messageSenderId = message.sender.toString();
      if (messageSenderId !== userId) {
        throw new BadRequestException(
          `You can only delete your own messages. Message sender: ${messageSenderId}, User: ${userId}`
        );
      }

      // Delete the message
      console.log(`Deleting message: ${messageId} by user: ${userId}`);
      await message.deleteOne();
      console.log(`Message successfully deleted: ${messageId}`);
    } catch (error) {
      console.error(`Error deleting message ${messageId}:`, error);
      throw error; // Re-throw to allow proper handling upstream
    }
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

  // Get basic user information by ID
  async getUserInfo(
    userId: string
  ): Promise<{ name: string; _id: string } | null> {
    try {
      // Convert string ID to ObjectId if needed
      let userObjectId: string | Types.ObjectId = userId;
      try {
        if (Types.ObjectId.isValid(userId)) {
          userObjectId = new Types.ObjectId(userId);
        }
      } catch (err) {
        // If conversion fails, use the original string
        console.log('Error converting ID to ObjectId:', err);
      }

      // First try to find the user directly from the user model
      const user = await this.userModel.findById(userObjectId).exec();
      if (user) {
        return {
          _id: (user as any)._id.toString(),
          name: (user as any).name || 'Unknown User',
        };
      }

      // If user not found (maybe due to permissions), try to get info from messages
      const userInfo = await this.messageModel
        .aggregate([
          // Find a message from this user
          { $match: { sender: userObjectId } },
          // Only take one
          { $limit: 1 },
          // Lookup the user in the users collection
          {
            $lookup: {
              from: 'users',
              localField: 'sender',
              foreignField: '_id',
              as: 'senderInfo',
            },
          },
          // Unwind the sender array
          {
            $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true },
          },
          // Project only the needed fields
          {
            $project: {
              _id: '$senderInfo._id',
              name: '$senderInfo.name',
            },
          },
        ])
        .exec();

      // If we found a user from messages, return it
      if (userInfo && userInfo.length > 0 && userInfo[0]._id) {
        return {
          _id: userInfo[0]._id.toString(),
          name: userInfo[0].name || 'Unknown User',
        };
      }

      // If all else fails, return a default with the user ID
      return {
        _id: userId,
        name: 'Unknown User',
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Return a default value on error
      return {
        _id: userId,
        name: 'Unknown User',
      };
    }
  }

  async getMessageReplies(
    messageId: string,
    page = 1,
    limit = 50
  ): Promise<{ replies: Message[]; total: number }> {
    // Verify the parent message exists
    const parentMessage = await this.messageModel.findById(messageId);
    if (!parentMessage) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    const [replies, total] = await Promise.all([
      this.messageModel
        .find({
          parentMessage: messageId,
          isReply: true,
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'name email username profileImage')
        .exec(),
      this.messageModel.countDocuments({
        parentMessage: messageId,
        isReply: true,
      }),
    ]);

    return { replies, total };
  }
}
