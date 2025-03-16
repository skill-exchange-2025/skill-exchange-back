import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lesson, LessonDocument } from '../schemas/lesson.schema';
import { Listing, ListingDocument } from '../schemas/listing.schema';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { PopulatedLesson } from '../interfaces/populated-lesson.interface';

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Listing.name) private listingModel: Model<ListingDocument>,
  ) {}

  async createLesson(
    userId: string,
    listingId: string,
    createLessonDto: CreateLessonDto
  ): Promise<LessonDocument> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(listingId)) {
        throw new NotFoundException('Invalid listing ID format');
      }

      const listing = await this.listingModel.findById(listingId);

      if (!listing) {
        throw new NotFoundException(`Listing with ID ${listingId} not found`);
      }

      // Convert both to strings to ensure proper comparison
      const sellerId = listing.seller.toString();
      const currentUserId = userId.toString();

      this.logger.debug(`Comparing seller ID: ${sellerId} with user ID: ${currentUserId}`);

      if (sellerId !== currentUserId) {
        throw new ForbiddenException(
          'You can only add lessons to your own listings'
        );
      }

      // Get highest order number for this listing
      const highestOrder = await this.lessonModel
        .findOne({ listing: listingId })
        .sort({ order: -1 })
        .select('order');

      const newOrder = (highestOrder?.order || 0) + 1;

      const lesson = new this.lessonModel({
        ...createLessonDto,
        instructor: userId,
        listing: listingId,
        order: newOrder,
        status: 'draft'
      });

      const savedLesson = await lesson.save();

      // Update listing with new lesson
      await this.listingModel.findByIdAndUpdate(
        listingId,
        { $push: { lessons: savedLesson._id } }
      );

      return savedLesson;
    } catch (error) {
      this.logger.error(`Error creating lesson: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLessonsByListing(listingId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException('Invalid listing ID format');
    }

    const skip = (page - 1) * limit;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;

    const [lessons, total] = await Promise.all([
      this.lessonModel
        .find({ listing: listingId })
        .sort({ order: 1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('instructor', 'name email')
        .exec(),
      this.lessonModel.countDocuments({ listing: listingId })
    ]);

    return {
      data: lessons,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    };
  }

  async getLessonById(id: string): Promise<PopulatedLesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(id)
      .populate('instructor', 'name email')
      .populate('listing', 'title type');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return lesson as unknown as PopulatedLesson;
  }

  async updateLesson(
    userId: string,
    lessonId: string,
    updateLessonDto: UpdateLessonDto
  ): Promise<LessonDocument> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('listing', 'seller');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const sellerId = (lesson.listing as any).seller.toString();
    const currentUserId = userId.toString();

    if (sellerId !== currentUserId) {
      throw new ForbiddenException('You can only update your own lessons');
    }

    const updatedLesson = await this.lessonModel.findByIdAndUpdate(
      lessonId,
      updateLessonDto,
      { new: true }
    );

    if (!updatedLesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return updatedLesson;
  }

  async deleteLesson(userId: string, lessonId: string): Promise<void> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('listing', 'seller');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const sellerId = (lesson.listing as any).seller.toString();
    const currentUserId = userId.toString();

    if (sellerId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    // Remove lesson from listing
    await this.listingModel.findByIdAndUpdate(
      lesson.listing,
      { $pull: { lessons: lessonId } }
    );

    // Delete the lesson
    await this.lessonModel.findByIdAndDelete(lessonId);

    // Reorder remaining lessons
    await this.reorderLessons(lesson.listing.toString());
  }

  async updateLessonOrder(userId: string, lessonId: string, newOrder: number): Promise<LessonDocument> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('listing', 'seller');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const sellerId = (lesson.listing as any).seller.toString();
    const currentUserId = userId.toString();

    if (sellerId !== currentUserId) {
      throw new ForbiddenException('Unauthorized to update lesson order');
    }

    // Update orders of other lessons
    await this.lessonModel.updateMany(
      {
        listing: lesson.listing,
        order: { $gte: newOrder },
        _id: { $ne: lessonId }
      },
      { $inc: { order: 1 } }
    );

    lesson.order = newOrder;
    return lesson.save();
  }

  private async reorderLessons(listingId: string): Promise<void> {
    const lessons = await this.lessonModel
      .find({ listing: listingId })
      .sort({ order: 1 });

    for (let i = 0; i < lessons.length; i++) {
      await this.lessonModel.findByIdAndUpdate(
        lessons[i]._id,
        { order: i + 1 }
      );
    }
  }

  async publishLesson(userId: string, lessonId: string): Promise<LessonDocument> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('listing', 'seller');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const sellerId = (lesson.listing as any).seller.toString();
    const currentUserId = userId.toString();

    if (sellerId !== currentUserId) {
      throw new ForbiddenException('Unauthorized to publish this lesson');
    }

    lesson.status = 'published';
    return lesson.save();
  }

  async archiveLesson(userId: string, lessonId: string): Promise<LessonDocument> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundException('Invalid lesson ID format');
    }

    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('listing', 'seller');

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const sellerId = (lesson.listing as any).seller.toString();
    const currentUserId = userId.toString();

    if (sellerId !== currentUserId) {
      throw new ForbiddenException('Unauthorized to archive this lesson');
    }

    lesson.status = 'archived';
    return lesson.save();
  }

  async getLessonsByInstructor(
    instructorId: string,
    page = 1,
    limit = 10,
    status?: string
  ) {
    if (!Types.ObjectId.isValid(instructorId)) {
      throw new NotFoundException('Invalid instructor ID format');
    }

    const skip = (page - 1) * limit;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;

    const query: any = { instructor: instructorId };

    if (status) {
      query['status'] = status;
    }

    const [lessons, total] = await Promise.all([
      this.lessonModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('listing', 'title type')
        .exec(),
      this.lessonModel.countDocuments(query)
    ]);

    return {
      data: lessons,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    };
  }

  async searchLessons(
    searchTerm: string,
    page = 1,
    limit = 10,
    filters: { type?: string; status?: string } = {}
  ) {
    const skip = (page - 1) * limit;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;

    const query: any = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [lessons, total] = await Promise.all([
      this.lessonModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('instructor', 'name email')
        .populate('listing', 'title type')
        .exec(),
      this.lessonModel.countDocuments(query)
    ]);

    return {
      data: lessons,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    };
  }
}
