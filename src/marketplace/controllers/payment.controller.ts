// src/marketplace/controllers/payment.controller.ts
import { 
    Controller, 
    Post, 
    Get, 
    Body, 
    Param, 
    Query, 
    UseGuards, 
    Request 
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { PaymentService } from '../services/payment.service';
  
  @ApiTags('payments')
  @Controller('payments')
  export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}
  
    @Post('create-payment-intent')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a payment intent with Stripe' })
    async createPaymentIntent(
      @Request() req,
      @Body() body: { amount: number }
    ) {
      return this.paymentService.createPaymentIntent(req.user.userId, body.amount);
    }
  
    @Post('confirm-payment')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Confirm a successful payment and add funds to wallet' })
    async confirmPayment(
      @Request() req,
      @Body() body: { paymentIntentId: string, amount: number }
    ) {
      return this.paymentService.processPayment(
        req.user.userId, 
        body.paymentIntentId, 
        body.amount
      );
    }
  
    @Get('wallet')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user wallet information' })
    async getWallet(@Request() req) {
      return this.paymentService.getWallet(req.user.userId);
    }
  
    @Get('transactions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user transaction history' })
    async getTransactions(
      @Request() req,
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 10
    ) {
      return this.paymentService.getTransactionHistory(req.user.userId, page, limit);
    }
  }