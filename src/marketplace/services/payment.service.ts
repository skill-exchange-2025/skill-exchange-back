// src/marketplace/services/payment.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Wallet, WalletDocument } from '../schemas/wallet.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private usersService: UsersService
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });
  }

  // Create a payment intent with Stripe
  async createPaymentIntent(
    userId: string,
    amount: number
  ): Promise<{ clientSecret: string; publicKey: string }> {
    try {
      const user = await this.usersService.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
        currency: 'tnd',
        metadata: {
          userId: userId,
        },
        // Optional: Add automatic payment methods
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(
        `Created payment intent ${paymentIntent.id} for user ${userId}`
      );

      const publicKey = this.configService.get<string>('STRIPE_PUBLIC_KEY');
      if (!publicKey) {
        throw new Error('STRIPE_PUBLIC_KEY is not configured');
      }

      // Check if client_secret exists
      if (!paymentIntent.client_secret) {
        throw new Error('No client secret returned from Stripe');
      }

      // Return both the client secret and the public key
      return {
        clientSecret: paymentIntent.client_secret,
        publicKey: publicKey,
      };
    } catch (error) {
      this.logger.error(
        `Payment intent creation failed: ${error.message}`,
        error.stack
      );
      throw new BadRequestException(
        `Payment intent creation failed: ${error.message}`
      );
    }
  }

  // Process a successful payment
  async processPayment(
    userId: string,
    paymentIntentId: string,
    amount: number
  ): Promise<WalletDocument> {
    try {
      // Verify the payment with Stripe
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException(
          `Payment has not been completed successfully. Status: ${paymentIntent.status}`
        );
      }

      // Verify the payment belongs to the user
      if (paymentIntent.metadata.userId !== userId) {
        throw new BadRequestException('Payment does not belong to this user');
      }

      // Create payment record
      const payment = await this.paymentModel.create({
        user: userId,
        amount,
        stripePaymentId: paymentIntentId,
        status: 'succeeded',
        description: 'Wallet deposit',
      });

      this.logger.log(
        `Processed payment ${paymentIntentId} for user ${userId}`
      );

      // Update user wallet
      return this.addFundsToWallet(userId, amount, 'deposit', paymentIntentId);
    } catch (error) {
      this.logger.error(
        `Payment processing failed: ${error.message}`,
        error.stack
      );
      throw new BadRequestException(
        `Payment processing failed: ${error.message}`
      );
    }
  }

  // Handle Stripe webhook events
  async handleWebhookEvent(
    rawBody: Buffer,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET'
      );

      if (!webhookSecret) {
        throw new Error('Stripe webhook secret is not configured');
      }

      // Verify the event came from Stripe
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      this.logger.log(`Received Stripe webhook event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        // Add more event handlers as needed
      }

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Webhook handling failed: ${error.message}`,
        error.stack
      );
      throw new BadRequestException(
        `Webhook handling failed: ${error.message}`
      );
    }
  }

  // Handle successful payment intent
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      const userId = paymentIntent.metadata.userId;

      if (!userId) {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} has no userId in metadata`
        );
        return;
      }

      // Check if we've already processed this payment
      const existingPayment = await this.paymentModel.findOne({
        stripePaymentId: paymentIntent.id,
      });

      if (existingPayment) {
        this.logger.log(`Payment ${paymentIntent.id} already processed`);
        return;
      }

      // Create payment record
      await this.paymentModel.create({
        user: userId,
        amount: paymentIntent.amount / 100, // Convert from cents
        stripePaymentId: paymentIntent.id,
        status: 'succeeded',
        description: 'Wallet deposit via webhook',
      });

      // Add funds to wallet
      await this.addFundsToWallet(
        userId,
        paymentIntent.amount / 100,
        'deposit',
        paymentIntent.id
      );

      this.logger.log(
        `Successfully processed webhook payment ${paymentIntent.id} for user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment_intent.succeeded: ${error.message}`,
        error.stack
      );
    }
  }

  // Handle failed payment intent
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      const userId = paymentIntent.metadata.userId;

      if (!userId) {
        this.logger.warn(
          `Failed payment intent ${paymentIntent.id} has no userId in metadata`
        );
        return;
      }

      // Create payment record for the failed payment
      await this.paymentModel.create({
        user: userId,
        amount: paymentIntent.amount / 100, // Convert from cents
        stripePaymentId: paymentIntent.id,
        status: 'failed',
        description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
      });

      this.logger.log(
        `Recorded failed payment ${paymentIntent.id} for user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment_intent.payment_failed: ${error.message}`,
        error.stack
      );
    }
  }

  // Get or create a user's wallet
  async getWallet(userId: string): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ user: userId });

    if (!wallet) {
      wallet = await this.walletModel.create({
        user: userId,
        balance: 0,
        transactions: [],
      });
      this.logger.log(`Created new wallet for user ${userId}`);
    }

    return wallet;
  }

  // Add funds to a user's wallet
  async addFundsToWallet(
    userId: string,
    amount: number,
    type: 'deposit' | 'sale',
    reference: string
  ): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId);

    wallet.balance += amount;
    wallet.transactions.push({
      amount,
      type,
      description:
        type === 'deposit'
          ? 'Funds added to wallet'
          : 'Payment received for skill sale',
      timestamp: new Date(),
      reference,
    });

    this.logger.log(`Added ${amount} to wallet for user ${userId}`);
    return wallet.save();
  }

  // Deduct funds from a user's wallet
  async deductFundsFromWallet(
    userId: string,
    amount: number,
    type: 'withdrawal' | 'purchase',
    reference: string
  ): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient funds in wallet');
    }

    wallet.balance -= amount;
    wallet.transactions.push({
      amount: -amount,
      type,
      description:
        type === 'withdrawal'
          ? 'Funds withdrawn from wallet'
          : 'Payment for skill purchase',
      timestamp: new Date(),
      reference,
    });

    this.logger.log(`Deducted ${amount} from wallet for user ${userId}`);
    return wallet.save();
  }

  // Get transaction history for a user
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<any> {
    const wallet = await this.getWallet(userId);

    const transactions = wallet.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice((page - 1) * limit, page * limit);

    return {
      balance: wallet.balance,
      transactions,
      total: wallet.transactions.length,
      page,
      limit,
      totalPages: Math.ceil(wallet.transactions.length / limit),
    };
  }

  // Process a marketplace transaction between buyer and seller
  async processMarketplaceTransaction(
    buyerId: string,
    sellerId: string,
    amount: number,
    listingId: string
  ): Promise<{ buyerWallet: WalletDocument; sellerWallet: WalletDocument }> {
    try {
      // Deduct from buyer's wallet
      const buyerWallet = await this.deductFundsFromWallet(
        buyerId,
        amount,
        'purchase',
        listingId
      );

      // Add to seller's wallet
      const sellerWallet = await this.addFundsToWallet(
        sellerId,
        amount,
        'sale',
        listingId
      );

      this.logger.log(
        `Processed marketplace transaction of ${amount} from ${buyerId} to ${sellerId} for listing ${listingId}`
      );
      return { buyerWallet, sellerWallet };
    } catch (error) {
      this.logger.error(
        `Marketplace transaction failed: ${error.message}`,
        error.stack
      );
      throw new BadRequestException(`Transaction failed: ${error.message}`);
    }
  }
}
