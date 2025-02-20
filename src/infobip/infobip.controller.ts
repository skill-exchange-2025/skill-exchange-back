import { Controller, Post, Body, Get } from '@nestjs/common';
import { InfobipService } from './infobip.service';

@Controller('infobip')
export class InfobipController {
  constructor(private readonly infobipService: InfobipService) {}

  // Endpoint to send SMS
  @Post('sendsms')
  async sendSMS(@Body() body: { to: string; message: string }) {
    const { to, message } = body;
    return this.infobipService.sendSMS(to, message);
  }

  // Endpoint to send email
  // @Post('sendemail')
  // async sendEmail(@Body() body: { to: string; subject: string; text: string }) {
  //   const { to, subject, text } = body;
  //   return this.infobipService.sendEmail(to, subject, text);
  // }
  // @Get()
  // sendMail(): void {
  //   this.infobipService.sendMail();  // Make sure the function returns a promise if needed
  // }
}