import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'islemt018@gmail.com', // Replace with your Gmail address
      pass: 'zbik tcno easj ejra', // Replace with the App Password generated in Step 1
    },
  });

  async sendEmail(to: string, subject: string, text: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"islem" <islemt018@gmail@gmail.com>', // Sender's email
        to, // Receiver's email
        subject, // Email subject
        text, // Email body (plain text)
      });

      console.log('Email sent:', info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
