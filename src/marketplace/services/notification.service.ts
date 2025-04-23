import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../schemas/notification.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private configService: ConfigService,
    private mailerService: MailerService,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>
  ) {}

  async sendMeetingNotification(
    sellerEmail: string,
    buyerEmail: string,
    title: string,
    startTime: Date,
    meetLink: string,
    sellerId: string,
    buyerId: string,
    transactionId: string
  ): Promise<void> {
    try {
      // Send email to seller
      await this.mailerService.sendMail({
        to: sellerEmail,
        subject: `New Meeting Scheduled: ${title}`,
        template: 'meeting-notification',
        context: {
          title,
          startTime: startTime.toLocaleString(),
          meetLink,
          role: 'seller',
        },
      });

      // Send email to buyer
      await this.mailerService.sendMail({
        to: buyerEmail,
        subject: `Meeting Scheduled: ${title}`,
        template: 'meeting-notification',
        context: {
          title,
          startTime: startTime.toLocaleString(),
          meetLink,
          role: 'buyer',
        },
      });

      // Create notification for seller
      const sellerNotification = new this.notificationModel({
        recipient: sellerId,
        type: 'meeting_scheduled',
        title: `New Meeting: ${title}`,
        message: `A meeting has been scheduled for ${startTime.toLocaleString()}`,
        transaction: transactionId,
        data: { meetLink },
        read: false,
      });
      await sellerNotification.save();

      // Create notification for buyer
      const buyerNotification = new this.notificationModel({
        recipient: buyerId,
        type: 'meeting_scheduled',
        title: `Meeting Scheduled: ${title}`,
        message: `Your meeting has been scheduled for ${startTime.toLocaleString()}`,
        transaction: transactionId,
        data: { meetLink },
        read: false,
      });
      await buyerNotification.save();

      this.logger.log(`Notifications created for transaction ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to send notifications: ${error.message}`);
      throw error;
    }
  }

  async createNotification(data: {
    recipient: string;
    transaction?: string;
    type: string;
    title: string;
    message: string;
  }): Promise<Notification> {
    const notification = new this.notificationModel(data);
    return notification.save();
  }

  async getNotifications(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const notifications = await this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('transaction')
      .exec();

    const total = await this.notificationModel.countDocuments({
      recipient: userId,
    });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    return notification.save();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
  }
}
