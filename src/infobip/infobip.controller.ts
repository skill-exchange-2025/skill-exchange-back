import { Controller, Post, Body } from '@nestjs/common';
import { InfobipService } from './infobip.service';

@Controller('infobip')
export class InfobipController {
  constructor(private readonly infobipService: InfobipService) {}

  @Post('sendsms')
  async sendSMS(@Body() body: { name: string, email: string }) {
    return this.infobipService.sendSMS(body.name, body.email);
  }
}
