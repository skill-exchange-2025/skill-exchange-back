// src/marketplace/controllers/webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/payment.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private paymentService: PaymentService
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });
  }

  @Post()
  async handleWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string
  ) {
    return this.paymentService.handleWebhookEvent(payload, signature);
  }

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET'
    );

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    if (!req.rawBody) {
      throw new Error('Request raw body is missing');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.log(`⚠️ Webhook signature verification failed.`, err.message);
      return { received: false };
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`Payment succeeded: ${paymentIntent.id}`);

        // If this payment was for adding funds to a wallet, process it
        if (paymentIntent.metadata.userId) {
          await this.paymentService.processPayment(
            paymentIntent.metadata.userId,
            paymentIntent.id,
            paymentIntent.amount / 100 // Convert from cents to dollars
          );
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log(`Payment failed: ${failedPaymentIntent.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
