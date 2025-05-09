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
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure uploads directory exists
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
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    })
  )
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const avatarUrl = `/uploads/${file.filename}`;
    return await this.profileService.uploadAvatar(user.id, avatarUrl);
  }
  
  @Get('avatar')
  async getAvatar(@CurrentUser() user: any) {
    return await this.profileService.getAvatar(user.id);
  }

  @Get(':userId')
async getProfileByUserId(@Param('userId') userId: string) {
  return await this.profileService.getPublicProfile(userId);
}
}
