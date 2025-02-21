import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private readonly usersService: UsersService
  ) {}

  async create(
    userId: string,
    createProfileDto: CreateProfileDto
  ): Promise<ProfileDocument> {
    // Check if profile already exists
    const existingProfile = await this.profileModel.findOne({ userId }).exec();
    if (existingProfile) {
      throw new BadRequestException('Profile already exists for this user');
    }

    const profile = new this.profileModel({
      userId,
      ...createProfileDto,
    });
    return await profile.save();
  }

  async findByUserId(userId: string): Promise<any> {
    try {
      const [profile, user] = await Promise.all([
        this.profileModel.findOne({ userId }).exec(),
        this.usersService.findById(userId),
      ]);

      if (!profile || !user) {
        throw new NotFoundException('Profile or User not found');
      }

      return {
        ...profile.toJSON(),
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          skills: user.skills || [],
          desiredSkills: user.desiredSkills || []
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error fetching profile data');
    }
  }

  async update(userId: string, updateData: UpdateProfileDto): Promise<any> {
    try {
      const { userUpdate, profileUpdate } = this.separateUpdateData(updateData);

      const [updatedProfile, updatedUser] = await Promise.all([
        this.profileModel
          .findOneAndUpdate({ userId }, profileUpdate, { new: true })
          .exec(),
        Object.keys(userUpdate).length > 0
          ? this.usersService.update(userId, userUpdate)
          : this.usersService.findById(userId),
      ]);

      if (!updatedProfile) {
        throw new NotFoundException('Profile not found');
      }

      return {
        ...updatedProfile.toJSON(),
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          skills: updatedUser.skills || [],
          desiredSkills: updatedUser.desiredSkills || [],
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error updating profile');
    }
  }

  async uploadAvatar(
    userId: string,
    avatarUrl: string
  ): Promise<ProfileDocument> {
    try {
      const profile = await this.profileModel
        .findOneAndUpdate(
          { userId },
          { avatarUrl },
          { new: true, upsert: true }
        )
        .exec();

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error uploading avatar');
    }
  }

  private separateUpdateData(updateData: any) {
    const profileFields = [
      'bio',
      'description',
      'location',
      'socialLinks',
      'profession',
      'interests',
      'birthDate'
    ];

    const userFields = ['name', 'email', 'phone', 'skills', 'desiredSkills'];

    const profileUpdate = {};
    const userUpdate = {};

    Object.keys(updateData).forEach((key) => {
      if (profileFields.includes(key)) {
        profileUpdate[key] = updateData[key];
      } else if (userFields.includes(key)) {
        userUpdate[key] = updateData[key];
      }
    });

    return { profileUpdate, userUpdate };
  }
}