// src/marketplace/controllers/stripe-webhook.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from '../services/payment.service';

@ApiTags('stripe-webhooks')
@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // The raw body is needed for webhook signature verification
      const rawBody = request.rawBody;

      if (!rawBody) {
        throw new BadRequestException('Missing request body');
      }

      return this.paymentService.handleWebhookEvent(rawBody, signature);
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }
}
