import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('send')
  async sendTestEmail() {
    const to = 'eslamtouati@gmail.com'; // Replace with recipient's email
    const subject = 'Test Email';
    const text = 'Hello! This is a test email from NestJS using Nodemailer.';

    return await this.mailService.sendEmail(to, subject, text);
  }
}
