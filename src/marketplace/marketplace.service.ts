// src/marketplace/marketplace.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const user = await this.usersService.findById(userId);

    // Verify user has the skill they're selling
    const hasSkill = user.skills.some(
      (skill) =>
        skill.name === createListingDto.skillName &&
        skill.proficiencyLevel === createListingDto.proficiencyLevel
    );

    if (!hasSkill) {
      throw new BadRequestException(
        'You can only sell skills that you possess at the specified proficiency level'
      );
    }

    const listing = new this.listingModel({
      ...createListingDto,
      seller: userId,
    });

    return listing.save();
  }

  async getListings(
    page = 1,
    limit = 10,
    search?: string,
    skillName?: string,
    minPrice?: number,
    maxPrice?: number
  ) {
    const query: any = { status: 'active' };

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (skillName) {
      query.skillName = new RegExp(skillName, 'i');
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    const [listings, total] = await Promise.all([
      this.listingModel
        .find(query)
        .populate('seller', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.listingModel.countDocuments(query),
    ]);

    return {
      data: listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getListingById(id: string): Promise<ListingDocument> {
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

    return listing;
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

    if (listing.seller.toString() === userId) {
      throw new BadRequestException('You cannot buy your own listing');
    }

    // Create transaction first with pending status
    const transaction = new this.transactionModel({
      buyer: userId,
      seller: listing.seller,
      listing: listing._id,
      amount: listing.price,
      status: 'pending_payment',
    });

    // Save the transaction to get an ID
    const savedTransaction = await transaction.save();
    const transactionId = (savedTransaction as any)._id.toString();

    try {
      // Process payment using wallet
      await this.paymentService.processMarketplaceTransaction(
        userId,
        listing.seller.toString(),
        listing.price,
        transactionId // Use transaction ID as reference
      );

      // Update transaction status to pending (service delivery)
      savedTransaction.status = 'pending';
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

    // Determine if user is buyer or seller
    let reviewee: string;
    if (transaction.buyer.toString() === userId) {
      reviewee = transaction.seller.toString();
    } else if (transaction.seller.toString() === userId) {
      reviewee = transaction.buyer.toString();
    } else {
      throw new BadRequestException('You are not part of this transaction');
    }

    // Check if review already exists
    const existingReview = await this.reviewModel.findOne({
      transaction: createReviewDto.transactionId,
      reviewer: userId,
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this transaction'
      );
    }

    const review = new this.reviewModel({
      reviewer: userId,
      reviewee,
      transaction: createReviewDto.transactionId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    return review.save();
  }

  // Helper methods
  private isProficiencyHigher(newLevel: string, currentLevel: string): boolean {
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    return levels.indexOf(newLevel) > levels.indexOf(currentLevel);
  }
}
