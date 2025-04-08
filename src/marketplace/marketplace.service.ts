// src/marketplace/marketplace.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UsersService } from '../users/users.service';
import { PaymentService } from './services/payment.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel(Listing.name) private listingModel: Model<ListingDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private usersService: UsersService,
    private paymentService: PaymentService
  ) {}

  // Listing methods
  async createListing(
    userId: string,
    createListingDto: CreateListingDto
  ): Promise<ListingDocument> {
    console.log('Creating listing with userId:', userId);
    console.log('CreateListingDto in service:', createListingDto);

    const user = await this.usersService.findById(userId);
    console.log('Found user:', user);

    // Verify user has the skill they're selling
    const userSkill = user.skills.find(
      (skill) => skill.name === createListingDto.skillName
    );

    if (!userSkill) {
      throw new BadRequestException(
        'You can only sell skills that you possess'
      );
    }

    // Check if user's proficiency level is equal to or higher than the listing level
    const hasRequiredProficiency =
      userSkill.proficiencyLevel === createListingDto.proficiencyLevel ||
      this.isProficiencyHigher(
        userSkill.proficiencyLevel,
        createListingDto.proficiencyLevel
      );

    if (!hasRequiredProficiency) {
      throw new BadRequestException(
        'You can only sell skills at proficiency levels equal to or lower than what you possess'
      );
    }

    const newListing = new this.listingModel({
      ...createListingDto,
      seller: userId,
    });

    return newListing.save();
  }

  async updateListing(
    listingId: string,
    updateListingDto: CreateListingDto
  ): Promise<ListingDocument> {
    const listing = await this.listingModel.findByIdAndUpdate(
      listingId,
      updateListingDto,
      { new: true }
    );

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async deleteListing(listingId: string): Promise<void> {
    const result = await this.listingModel.findByIdAndDelete(listingId);
    if (!result) {
      throw new NotFoundException('Listing not found');
    }
  }

  async getListings(
    page = 1,
    limit = 10,
    search?: string,
    skillName?: string,
    minPrice?: number,
    maxPrice?: number,
    category?: string,
    proficiencyLevel?: string,
    type?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    const query: any = { status: 'active' };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skillName: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Skill name filter
    if (skillName) {
      query.skillName = skillName;
    }

    // Proficiency level filter
    if (proficiencyLevel) {
      query.proficiencyLevel = proficiencyLevel;
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query.price.$lte = maxPrice;
      }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const listings = await this.listingModel
      .find(query)
      .populate('seller', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.listingModel.countDocuments(query);

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getListingsByType(
    type: string,
    page = 1,
    limit = 10,
    search?: string,
    skillName?: string,
    minPrice?: number,
    maxPrice?: number
  ) {
    const skip = (page - 1) * limit;
    const query: any = { status: 'active', type };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skillName: { $regex: search, $options: 'i' } },
      ];
    }

    if (skillName) {
      query.skillName = skillName;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query.price.$lte = maxPrice;
      }
    }

    const listings = await this.listingModel
      .find(query)
      .populate('seller', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.listingModel.countDocuments(query);

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getListingById(id: string): Promise<any> {
    const listing = await this.listingModel
      .findById(id)
      .populate('seller', 'name email')
      .exec();

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count
    listing.views += 1;
    await listing.save();

    // Get review statistics
    const reviews = await this.reviewModel.find({ listing: id });
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : 0;

    // Return listing with review information
    return {
      ...listing.toJSON(),
      reviewCount,
      averageRating,
    };
  }

  // Update the createTransaction method
  async createTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto
  ): Promise<TransactionDocument> {
    const listing = await this.listingModel.findById(
      createTransactionDto.listingId
    );

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new BadRequestException('This listing is no longer available');
    }

    // Get the user object to ensure we have a valid ObjectId
    const buyer = await this.usersService.findById(userId);

    if (listing.seller.toString() === (buyer._id as any).toString()) {
      throw new BadRequestException('You cannot buy your own listing');
    }

    // Create transaction first with pending status
    const transaction = new this.transactionModel({
      buyer: buyer._id as any,
      seller: listing.seller,
      listing: listing._id,
      amount: listing.price,
      status: 'pending_payment',
    });

    console.log('Transaction object before save:', transaction);

    // Save the transaction to get an ID
    const savedTransaction = await transaction.save();
    const transactionId = (savedTransaction._id as any).toString();

    try {
      // Process payment using wallet
      await this.paymentService.processMarketplaceTransaction(
        (buyer._id as any).toString(),
        listing.seller.toString(),
        listing.price,
        transactionId // Use transaction ID as reference
      );

      // Update transaction status to completed (service delivery)
      savedTransaction.status = 'completed';
      await savedTransaction.save();

      // Update listing status
      listing.status = 'sold';
      await listing.save();

      return savedTransaction;
    } catch (error) {
      // If payment fails, update transaction status to failed
      savedTransaction.status = 'failed';
      await savedTransaction.save();

      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  async completeTransaction(
    userId: string,
    transactionId: string
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('listing')
      .exec();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (
      transaction.buyer.toString() !== userId &&
      transaction.seller.toString() !== userId
    ) {
      throw new BadRequestException(
        'You are not authorized to complete this transaction'
      );
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestException(
        `Transaction is already ${transaction.status}`
      );
    }

    transaction.status = 'completed';
    transaction.completedAt = new Date();

    // Add the skill to the buyer's profile
    const buyer = await this.usersService.findById(
      transaction.buyer.toString()
    );
    const listing = transaction.listing as any;

    // Check if buyer already has this skill
    const existingSkillIndex = buyer.skills.findIndex(
      (skill) => skill.name === listing.skillName
    );

    if (existingSkillIndex >= 0) {
      // Update existing skill if new proficiency is higher
      const currentProficiency =
        buyer.skills[existingSkillIndex].proficiencyLevel;
      if (
        this.isProficiencyHigher(listing.proficiencyLevel, currentProficiency)
      ) {
        buyer.skills[existingSkillIndex].proficiencyLevel =
          listing.proficiencyLevel;
        await buyer.save();
      }
    } else {
      // Add new skill
      buyer.skills.push({
        name: listing.skillName,
        description: `Acquired from marketplace: ${listing.title}`,
        proficiencyLevel: listing.proficiencyLevel,
      });
      await buyer.save();
    }

    return transaction.save();
  }

  // Review methods
  async createReview(
    userId: string,
    createReviewDto: CreateReviewDto
  ): Promise<ReviewDocument> {
    const transaction = await this.transactionModel.findById(
      createReviewDto.transactionId
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new BadRequestException(
        'You can only review completed transactions'
      );
    }

    // Get the user object to ensure we have a valid ObjectId
    const reviewer = await this.usersService.findById(userId);

    // Determine if user is buyer or seller
    let reviewee: string;
    if (transaction.buyer.toString() === (reviewer._id as any).toString()) {
      reviewee = transaction.seller.toString();
    } else if (
      transaction.seller.toString() === (reviewer._id as any).toString()
    ) {
      reviewee = transaction.buyer.toString();
    } else {
      throw new BadRequestException('You are not part of this transaction');
    }

    // Check if review already exists
    const existingReview = await this.reviewModel.findOne({
      transaction: createReviewDto.transactionId,
      reviewer: reviewer._id as any,
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this transaction'
      );
    }

    const review = new this.reviewModel({
      reviewer: reviewer._id as any,
      reviewee,
      transaction: createReviewDto.transactionId,
      listing: transaction.listing,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment || '',
    });

    console.log('Review object before save:', review);

    return review.save();
  }

  async getListingReviews(listingId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reviews = await this.reviewModel
      .find({ listing: listingId })
      .populate('reviewer', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.reviewModel.countDocuments({ listing: listingId });

    // Calculate average rating
    const ratingSum = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? ratingSum / reviews.length : 0;

    return {
      reviews,
      total,
      averageRating,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Helper methods
  private isProficiencyHigher(newLevel: string, currentLevel: string): boolean {
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    return levels.indexOf(newLevel) > levels.indexOf(currentLevel);
  }
}
