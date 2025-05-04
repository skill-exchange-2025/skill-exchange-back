import {
  Controller,
  Post,
  Body,
  UseGuards,
  Query,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@ApiBearerAuth()
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Create new feedback' })
  async createFeedback(
    @CurrentUser() user: any,
    @Body() createFeedbackDto: CreateFeedbackDto
  ) {
    return await this.feedbackService.create(user.id, createFeedbackDto);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserFeedback(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return await this.feedbackService.getFeedbackByUser(user.id, page, limit);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateFeedback(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateFeedbackDto: CreateFeedbackDto
  ) {
    return await this.feedbackService.updateFeedback(
      user.id,
      id,
      updateFeedbackDto
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteFeedback(@CurrentUser() user: any, @Param('id') id: string) {
    return await this.feedbackService.deleteFeedback(user.id, id);
  }
}
