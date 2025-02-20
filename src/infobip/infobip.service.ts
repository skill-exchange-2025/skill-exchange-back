import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
//import { MailerService } from '@nestjs-modules/mailer';
import { from, Subject } from 'rxjs';
import { text } from 'stream/consumers';

@Injectable()
export class InfobipService {
  private readonly baseURL = process.env.INFOBIP_BASE_URL;
  private readonly apiKey = process.env.INFOBIP_API_KEY;
  private readonly senderSMS = process.env.INFOBIP_SENDER_SMS;

  // Email-related fields
  private readonly senderEmail = process.env.MAIL_SENDER_EMAIL;
  private readonly smtpHost = process.env.MAIL_SMTP_HOST;
  private readonly smtpPort = process.env.MAIL_SMTP_PORT ? parseInt(process.env.MAIL_SMTP_PORT, 10) : 587;
  private readonly smtpUser = process.env.MAIL_SMTP_USER;
  private readonly smtpPass = process.env.MAIL_SMTP_PASS;

  private readonly transporter;

  constructor() {
    // Set up Nodemailer transporter
    // this.transporter = nodemailer.createTransport({
    //   host: this.smtpHost,
    //   port: this.smtpPort,
    //   secure: this.smtpPort === 465,  // True for 465, false for 587/25 (TLS)
    //   auth: {
    //     user: this.smtpUser,
    //     pass: this.smtpPass,
    //   },
    // });
  }

  // Method to send SMS using Infobip API
  async sendSMS(to: string, message: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/sms/2/text/advanced`,  // Infobip SMS API endpoint
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
            Authorization: `App ${this.apiKey}`,  // Authorization with Infobip API key
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('SMS sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message);
      throw error;
    }
  }

  // Method to send email using Nodemailer
  async sendEmail(to: string, subject: string, text: string): Promise<any> {
    try {
      const mailOptions = {
        from: this.senderEmail,
        to,
        subject,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
  // async sendMail(): Promise<void> {
  //   try {
  //     await this.mailerService.sendMail({
  //       to: 'eslamtouati@gmail.com',
  //       from: 'islemt018@gmail.com',
  //       subject: 'test',  // Corrected 'subject' case-sensitive
  //       text: 'test',     // Corrected 'text' case-sensitive
  //     });
  //     console.log('Email sent successfully');
  //   } catch (error) {
  //     console.error('Error sending email:', error);
  //   }
  // }

}
