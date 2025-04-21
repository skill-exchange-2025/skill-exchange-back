import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from './schemas/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<Feedback>
  ) {}

  async create(
    userId: string,
    createFeedbackDto: CreateFeedbackDto
  ): Promise<Feedback> {
    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      userId,
    });
    return feedback.save();
  }
  //get feedbacks!!
  async getFeedbackByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const feedback = await this.feedbackModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.feedbackModel.countDocuments({ userId });

    return {
      data: feedback,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  //update feedback
  async updateFeedback(
    userId: string,
    feedbackId: string,
    updateFeedbackDto: CreateFeedbackDto
  ) {
    const feedback = await this.feedbackModel.findById(feedbackId);

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${feedbackId} not found`);
    }

    if (feedback.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own feedback');
    }

    return this.feedbackModel.findByIdAndUpdate(feedbackId, updateFeedbackDto);
  }

  async deleteFeedback(userId: string, feedbackId: string) {
    const feedback = await this.feedbackModel.findById(feedbackId);

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${feedbackId} not found`);
    }

    if (feedback.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own feedback');
    }

    await this.feedbackModel.findByIdAndDelete(feedbackId);
    return { message: 'Feedback deleted successfully' };
  }
}
