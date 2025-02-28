// src/profile/profile.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';

const uploadDir = './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: any) {
    return await this.profileService.findByUserId(user.id);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: any,
    @Body() createProfileDto: CreateProfileDto
  ) {
    return await this.profileService.create(user.id, createProfileDto);
  }

  @Put()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return await this.profileService.update(user.id, updateProfileDto);
  }

  @Get('completion-status')
  async getCompletionStatus(@CurrentUser() user: any) {
    return await this.profileService.calculateProfileCompletion(user.id);
  }
  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Generate the URL for the uploaded file
    const avatarUrl = `/uploads/${file.filename}`;

    return await this.profileService.uploadAvatar(user.id, avatarUrl);
  }
}
