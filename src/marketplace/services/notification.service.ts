import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class NotificationService {
  constructor(
    private configService: ConfigService,
    private mailerService: MailerService
  ) {}

  async sendMeetingNotification(
    sellerEmail: string,
    buyerEmail: string,
    title: string,
    startTime: Date,
    meetLink: string
  ): Promise<void> {
    const formattedTime = startTime.toLocaleString();

    // Send notification to seller
    await this.mailerService.sendMail({
      to: sellerEmail,
      subject: 'New Interactive Course Meeting Scheduled',
      template: 'meeting-notification',
      context: {
        title,
        startTime: formattedTime,
        meetLink,
        role: 'seller',
      },
    });

    await this.mailerService.sendMail({
      to: buyerEmail,
      subject: 'Interactive Course Meeting Scheduled',
      template: 'meeting-notification',
      context: {
        title,
        startTime: formattedTime,
        meetLink,
        role: 'buyer',
      },
    });
  }
}
