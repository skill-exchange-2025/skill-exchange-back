// src/marketplace/marketplace.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  BadRequestException,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateReviewDto } from './dto/create-review.dto';
@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new skill listing' })
  async createListing(
    @Request() req,
    @Body() createListingDto: CreateListingDto
  ) {
    console.log('User object:', req.user);
    console.log('CreateListingDto:', createListingDto);
    return this.marketplaceService.createListing(
      req.user._id,
      createListingDto
    );
  }

  @Put('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing' })
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: CreateListingDto
  ) {
    return this.marketplaceService.updateListing(id, updateListingDto);
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a listing' })
  async deleteListing(@Param('id') id: string) {
    return this.marketplaceService.deleteListing(id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'Get all active listings with filters' })
  async getListings(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('skillName') skillName?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number
  ) {
    return this.marketplaceService.getListings(
      page,
      limit,
      search,
      skillName,
      minPrice,
      maxPrice
    );
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get a listing by ID' })
  async getListingById(@Param('id') id: string) {
    return this.marketplaceService.getListingById(id);
  }

  @Post('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new transaction (buy a skill)' })
  async createTransaction(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto
  ) {
    return this.marketplaceService.createTransaction(
      req.user._id,
      createTransactionDto
    );
  }

  @Put('transactions/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a transaction' })
  async completeTransaction(@Request() req, @Param('id') id: string) {
    return this.marketplaceService.completeTransaction(req.user._id, id);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a transaction' })
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.marketplaceService.createReview(req.user._id, createReviewDto);
  }
}
