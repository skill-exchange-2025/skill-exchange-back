// src/marketplace/marketplace.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
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
import { GoogleMeetService } from './services/google-meet.service';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: true,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      defaults: {
        from: process.env.SMTP_FROM || '',
      },
    }),
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
  providers: [
    MarketplaceService,
    PaymentService,
    GoogleMeetService,
    NotificationService,
  ],
  exports: [
    MarketplaceService,
    PaymentService,
    GoogleMeetService,
    NotificationService,
  ],
})
export class MarketplaceModule {}
