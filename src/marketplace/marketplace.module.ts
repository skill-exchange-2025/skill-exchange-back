// src/marketplace/marketplace.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { Lesson, LessonSchema } from './schemas/lesson.schema';
import { LessonService } from './services/lessons.service';
import { LessonController } from './controllers/lessons.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Listing.name, schema: ListingSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
    UsersModule,
    ProfileModule,
  ],
  controllers: [
    MarketplaceController,
    PaymentController,
    StripeWebhookController,
    LessonController,
  ],
  providers: [MarketplaceService, PaymentService, LessonService],
  exports: [MarketplaceService, PaymentService, LessonService],
})
export class MarketplaceModule {}
