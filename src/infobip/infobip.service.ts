import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InfobipService {
  private readonly baseURL = process.env.INFOBIP_BASE_URL;
  private readonly apiKey = process.env.INFOBIP_API_KEY;
  private readonly senderSMS = process.env.INFOBIP_SENDER_SMS;

  // Method to send SMS
  async sendSMS(to: string, message: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/sms/2/text/advanced`,
        {
          messages: [
            {
              from: this.senderSMS,
              destinations: [{ to }],
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `App ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Error sending SMS:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Method to send email
  async sendEmail(to: string, subject: string, text: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/email/3/send`,
        {
          from: this.sendEmail,
          to: [{ email: to }],
          subject,
          text,
        },
        {
          headers: {
            Authorization: `App ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error.response?.data || error.message, error.stack);
      throw error;
    }
  }
}
