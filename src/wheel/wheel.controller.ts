import { Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WheelService } from './wheel.service';
import { Request } from 'express'; // Import Request from express

interface RequestWithUser extends Request {
  user: {
    _id: string;
    [key: string]: any;
  };
}
@Controller('wheel-spin')
@UseGuards(JwtAuthGuard)
export class WheelController {
  constructor(private readonly wheelService: WheelService) {}

  @Post()
  async spinWheel(@Req() req: RequestWithUser) {
    return this.wheelService.spinWheel(req.user._id);
  }

  @Get('last-spin')
  async getLastSpinTime(@Req() req: RequestWithUser) {
    return this.wheelService.getLastSpinTime(req.user._id);
  }
}
