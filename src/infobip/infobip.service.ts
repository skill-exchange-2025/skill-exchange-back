import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InfobipService {
  private readonly baseURL = process.env.INFOBIP_BASE_URL;
  private readonly apiKey = process.env.INFOBIP_API_KEY;
  private readonly senderSMS = process.env.INFOBIP_SENDER_SMS;
  private readonly myPhoneNumber = process.env.MY_PHONE_NUMBER;  // Verified phone number to receive SMS

  constructor() {}

  async sendSMS(name: string, email: string): Promise<any> {
    try {
      const message = `📲 New account created!\nName: ${name}\nEmail: ${email}`;
  
      const response = await axios.post(
        `${this.baseURL}/sms/2/text/advanced`,
        {
          messages: [
            {
              from: this.senderSMS,               // Sender number (configured in .env)
              destinations: [{ to: this.myPhoneNumber }],  // Recipient is your verified number
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
  
      console.log('SMS sent:', response.data);
      return response.data;
    } catch (error) {
      if (error.response) {
        // Error from Infobip API
        console.error('Error sending SMS:', error.response.data);
        throw new BadRequestException('Failed to send SMS: ' + error.response.data);
      } else if (error.request) {
        // Error with the request itself
        console.error('Error with the request:', error.request);
        throw new BadRequestException('Failed to send SMS: No response received.');
      } else {
        // General error
        console.error('Unexpected error:', error.message);
        throw new InternalServerErrorException('Unexpected error occurred.');
      }
    }
  }
}  
