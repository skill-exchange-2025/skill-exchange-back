import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  BadRequestException,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateCourseListingDto } from './dto/create-course-listing.dto';
import { CreateOnlineCourseListingDto } from './dto/create-online-course-listing.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListingType } from './schemas/listing.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}
  @Get('my-purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user's purchased courses and listings",
  })
  async getMyPurchases(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string
  ) {
    return this.marketplaceService.getTransactionsByBuyer(
      req.user._id,
      page,
      limit,
      status
    );
  }
  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new skill listing (generic)' })
  async createListing(
    @Request() req,
    @Body() createListingDto: CreateListingDto
  ) {
    console.log('User object:', req.user);
    console.log('CreateListingDto:', createListingDto);
    return this.marketplaceService.createListing(
      req.user._id,
      createListingDto
    );
  }

  @Post('courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new static course listing (PDFs, videos, etc.)',
  })
  async createCourseListing(
    @Request() req,
    @Body() createCourseListingDto: CreateCourseListingDto
  ) {
    console.log('User object:', req.user);
    console.log('CreateCourseListingDto:', createCourseListingDto);
    return this.marketplaceService.createListing(
      req.user._id,
      createCourseListingDto
    );
  }

  @Post('online-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a new interactive/live online course listing with student limits',
  })
  async createOnlineCourseListing(
    @Request() req,
    @Body() createOnlineCourseListingDto: CreateOnlineCourseListingDto
  ) {
    console.log('User object:', req.user);
    console.log('CreateOnlineCourseListingDto:', createOnlineCourseListingDto);
    return this.marketplaceService.createListing(
      req.user._id,
      createOnlineCourseListingDto
    );
  }

  @Put('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing' })
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: CreateListingDto
  ) {
    return this.marketplaceService.updateListing(id, updateListingDto);
  }
  @Get('calendar/metadata')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Calendar metadata' })
  async getCalendarMetadata(
    @Query('calendarId') calendarId: string = 'primary'
  ) {
    return this.marketplaceService.getCalendarMetadata(calendarId);
  }
  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a listing' })
  async deleteListing(@Param('id') id: string) {
    return this.marketplaceService.deleteListing(id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'Get all active listings with filters' })
  async getListings(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('skillName') skillName?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('category') category?: string,
    @Query('proficiencyLevel') proficiencyLevel?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    return this.marketplaceService.getListings(
      page,
      limit,
      search,
      skillName,
      minPrice,
      maxPrice,
      category,
      proficiencyLevel,
      type,
      sortBy,
      sortOrder
    );
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get a listing by ID' })
  async getListingById(@Param('id') id: string) {
    return this.marketplaceService.getListingById(id);
  }

  @Post('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new transaction (buy a skill)' })
  async createTransaction(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto
  ) {
    return this.marketplaceService.createTransaction(
      req.user._id,
      createTransactionDto
    );
  }

  @Put('transactions/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a transaction' })
  async completeTransaction(@Request() req, @Param('id') id: string) {
    return this.marketplaceService.completeTransaction(req.user._id, id);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a transaction' })
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.marketplaceService.createReview(req.user._id, createReviewDto);
  }

  @Get('listings/:id/reviews')
  @ApiOperation({ summary: 'Get reviews for a specific listing' })
  async getListingReviews(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.marketplaceService.getListingReviews(id, page, limit);
  }

  @Get('courses')
  @ApiOperation({
    summary: 'Get all static course listings (PDFs, videos, etc.)',
  })
  async getCoursesListings(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('skillName') skillName?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number
  ) {
    return this.marketplaceService.getListingsByType(
      ListingType.COURSE,
      page,
      limit,
      search,
      skillName,
      minPrice,
      maxPrice
    );
  }

  @Get('online-courses')
  @ApiOperation({
    summary:
      'Get all interactive/live online course listings with student limits',
  })
  async getOnlineCoursesListings(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('skillName') skillName?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number
  ) {
    return this.marketplaceService.getListingsByType(
      ListingType.ONLINE_COURSE,
      page,
      limit,
      search,
      skillName,
      minPrice,
      maxPrice
    );
  }

  @Post('meetings/book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a meeting for a listing' })
  @ApiResponse({ status: 201, description: 'Meeting booked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bookMeeting(
    @Request() req,
    @Body() createMeetingDto: CreateMeetingDto
  ) {
    if (!createMeetingDto.meetingStartTime) {
      throw new BadRequestException('Meeting start time is required');
    }

    // Ensure meetingStartTime is a valid Date object
    const startTime = new Date(createMeetingDto.meetingStartTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid meeting start time');
    }

    const createTransactionDto: CreateTransactionDto = {
      listingId: createMeetingDto.listingId,
      buyerId: req.user._id,
      sellerId: createMeetingDto.sellerId,
      startTime: startTime,
      endTime: new Date(
        startTime.getTime() + createMeetingDto.meetingDuration * 60000
      ),
    };
    return this.marketplaceService.createTransaction(
      req.user._id,
      createTransactionDto
    );
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.marketplaceService.getNotifications(req.user._id, page, limit);
  }

  @Put('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(@Request() req, @Param('id') id: string) {
    return this.marketplaceService.markNotificationAsRead(id, req.user._id);
  }

  @Put('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@Request() req) {
    return this.marketplaceService.markAllNotificationsAsRead(req.user._id);
  }
}
