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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    UsersModule,
    ProfileModule,
  ],
  controllers: [
    MarketplaceController,
    PaymentController,
    StripeWebhookController,
  ],
  providers: [MarketplaceService, PaymentService],
  exports: [MarketplaceService, PaymentService],
})
export class MarketplaceModule {}
