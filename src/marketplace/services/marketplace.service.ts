import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { Transaction } from '../schemas/transaction.schema';
import { Listing, ListingDocument } from '../schemas/listing.schema';
import { GoogleMeetService } from '../services/google-meet.service';
import { NotificationService } from '../services/notification.service';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Listing.name) private listingModel: Model<ListingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private googleMeetService: GoogleMeetService,
    private notificationService: NotificationService
  ) {}

  async createTransaction(
    createTransactionDto: CreateTransactionDto
  ): Promise<Transaction> {
    try {
      const { listingId, buyerId, sellerId, startTime, endTime } =
        createTransactionDto;

      if (!startTime || !endTime) {
        throw new NotFoundException('Start time and end time are required');
      }

      // Get listing details
      const listing = await this.listingModel.findById(listingId).exec();
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      // Get user details
      const seller = await this.userModel.findById(sellerId).exec();
      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      const buyer = await this.userModel.findById(buyerId).exec();
      if (!buyer) {
        throw new NotFoundException('Buyer not found');
      }

      // Create transaction with initial data
      const transaction = new this.transactionModel({
        listing: listingId,
        buyer: buyerId,
        seller: sellerId,
        amount: listing.price,
        status: 'pending_payment',
        startTime,
        endTime,
      });

      // Save transaction to get ID
      const savedTransaction = await transaction.save();

      // If it's an interactive course, use the videoUrl and send notifications
      if (listing.type === 'interactive_course') {
        if (!listing.videoUrl) {
          throw new NotFoundException(
            'Video URL is required for interactive courses'
          );
        }

        // Update transaction with meeting details
        const updatedTransaction = await this.transactionModel
          .findByIdAndUpdate(
            savedTransaction._id,
            {
              $set: {
                meetLink: listing.videoUrl,
                meetingScheduledAt: startTime,
                status: 'pending_payment',
              },
            },
            { new: true }
          )
          .exec();

        if (!updatedTransaction) {
          throw new NotFoundException('Transaction not found after update');
        }

        // Send notifications
        await this.notificationService.sendMeetingNotification(
          seller.email,
          buyer.email,
          listing.title,
          startTime,
          listing.videoUrl,
          sellerId,
          buyerId,
          savedTransaction._id.toString()
        );

        return updatedTransaction;
      }

      // For non-interactive courses, just return the saved transaction
      return savedTransaction;
    } catch (error) {
      this.logger.error(`Failed to create transaction: ${error.message}`);
      throw error;
    }
  }
}
