// src/marketplace/controllers/lesson.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LessonService } from '../services/lessons.service';
import { CreateLessonDto } from '../dto/create-lesson.dto';

@ApiTags('lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post('listing/:listingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lesson for a listing' })
  async createLesson(
    @Request() req,
    @Param('listingId') listingId: string,
    @Body() createLessonDto: CreateLessonDto
  ) {
    return this.lessonService.createLesson(req.user._id, listingId, createLessonDto);
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get all lessons for a listing' })
  async getLessonsByListing(
    @Param('listingId') listingId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.lessonService.getLessonsByListing(listingId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by ID' })
  async getLessonById(@Param('id') id: string) {
    return this.lessonService.getLessonById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson' })
  async updateLesson(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLessonDto: CreateLessonDto
  ) {
    return this.lessonService.updateLesson(req.user._id, id, updateLessonDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson' })
  async deleteLesson(
    @Request() req,
    @Param('id') id: string
  ) {
    return this.lessonService.deleteLesson(req.user._id, id);
  }

  @Put(':id/order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson order' })
  async updateLessonOrder(
    @Request() req,
    @Param('id') id: string,
    @Body('order') order: number
  ) {
    return this.lessonService.updateLessonOrder(req.user._id, id, order);
  }
}