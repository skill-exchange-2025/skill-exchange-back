import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { NotificationService } from './notification.service';

@Injectable()
export class GoogleMeetService {
  private calendar;
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(
    private configService: ConfigService,
    private notificationService: NotificationService,
  ) {
    try {
      const clientEmail = this.configService.get('GOOGLE_CLIENT_EMAIL');
      const privateKey = this.configService.get('GOOGLE_PRIVATE_KEY');

      if (!clientEmail || !privateKey) {
        throw new Error('Google credentials are not properly configured');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.log('Google Calendar API initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Calendar API:', error);
      throw error;
    }
  }

  async createMeeting(
    title: string,
    startTime: Date,
    duration: number,
    sellerEmail: string,
    buyerEmail: string,
  ): Promise<{ meetLink: string; eventId: string }> {
    try {
      this.logger.log(`Creating meeting: ${title} at ${startTime}`);

      const event = {
        summary: title,
        description: 'Skill Exchange Interactive Course Meeting',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(startTime.getTime() + duration * 60000).toISOString(),
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(2, 8),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        attendees: [
          { email: sellerEmail },
          { email: buyerEmail },
        ],
      };

      this.logger.debug('Event object:', JSON.stringify(event, null, 2));

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
      });

      const meetLink = response.data.conferenceData.entryPoints[0].uri;
      const eventId = response.data.id;

      this.logger.log(`Meeting created successfully: ${meetLink}`);

      // Send notifications
      await this.notificationService.sendMeetingNotification(
        sellerEmail,
        buyerEmail,
        title,
        startTime,
        meetLink,
      );

      return { meetLink, eventId };
    } catch (error) {
      this.logger.error('Failed to create Google Meet:', error);
      this.logger.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });
      throw new Error(`Failed to create Google Meet: ${error.message}`);
    }
  }
} 