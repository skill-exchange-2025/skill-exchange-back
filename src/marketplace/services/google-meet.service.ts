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
    private notificationService: NotificationService
  ) {
    try {
      this.logger.log('Initializing Google Calendar API...');

      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      this.logger.debug('Retrieved credentials:', {
        clientEmail: clientEmail ? 'Present' : 'Missing',
        privateKey: privateKey ? 'Present' : 'Missing',
      });

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

      this.logger.log('Creating Google Calendar client...');
      this.calendar = google.calendar({ version: 'v3', auth });

      this.logger.log('Google Calendar API initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Calendar API:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }
  async getCalendarMetadata(calendarId: string = 'primary') {
    try {
      this.logger.log(`Fetching metadata for calendar: ${calendarId}`);
      const response = await this.calendar.calendars.get({ calendarId });
      this.logger.debug('Calendar metadata response:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch calendar metadata:', error);
      throw new Error(`Failed to fetch calendar metadata: ${error.message}`);
    }
  }
  async createMeeting(
    title: string,
    startTime: Date,
    duration: number,
    sellerEmail: string,
    buyerEmail: string,
    sellerId: string,
    buyerId: string,
    transactionId: string
  ): Promise<{ meetLink: string; eventId: string }> {
    try {
      this.logger.log('Starting meeting creation process...');
      this.logger.debug('Meeting details:', {
        title,
        startTime: startTime.toISOString(),
        duration,
        sellerEmail,
        buyerEmail,
      });

      const event = {
        summary: title,
        description: 'Skill Exchange Interactive Course Meeting',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(
            startTime.getTime() + duration * 60000
          ).toISOString(),
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
        attendees: [{ email: sellerEmail }, { email: buyerEmail }],
      };

      this.logger.debug(
        'Prepared event object:',
        JSON.stringify(event, null, 2)
      );

      this.logger.log('Sending request to Google Calendar API...');
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
      });

      this.logger.debug('Google Calendar API response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      const meetLink = response.data.conferenceData.entryPoints[0].uri;
      const eventId = response.data.id;

      this.logger.log('Meeting created successfully:', {
        meetLink,
        eventId,
        calendarEventId: response.data.id,
      });

      return { meetLink, eventId };
    } catch (error) {
      this.logger.error('Failed to create Google Meet:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      throw new Error(`Failed to create Google Meet: ${error.message}`);
    }
  }
}
