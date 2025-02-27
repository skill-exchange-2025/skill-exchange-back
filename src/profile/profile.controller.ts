import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  UseInterceptors, Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@CurrentUser() user: any) {
    const avatarUrl = 'temporary-url'; // Replace with actual upload logic
    return await this.profileService.uploadAvatar(user.id, avatarUrl);
  }
}
