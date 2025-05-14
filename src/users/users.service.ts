import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../auth/enums/role.enum';
import { Permission } from '../auth/enums/permission.enum';
import {
  PermissionGroup,
  PermissionGroupDocument,
} from '../auth/schemas/permission-group.schema';
import { UserWithPermissions } from './interfaces/user-with-permissions.interface';
import { UserSkill, UserSkillDocument } from './schemas/user.skill.schema';
import {
  UserDesiredSkill,
  UserDesiredSkillDocument,
} from './schemas/user.desired.skill';
import { BlacklistService } from 'src/blacklist/blacklist/blacklist.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PermissionGroup.name)
    private permissionGroupModel: Model<PermissionGroupDocument>,
    @InjectModel(UserSkill.name)
    private userSkillModel: Model<UserSkillDocument>,
    @InjectModel(UserDesiredSkill.name)
    private userDesiredSkillModel: Model<UserDesiredSkillDocument>,
    private readonly blacklistService: BlacklistService, // Inject BlacklistService

  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      console.log('Creating user with email:', createUserDto.email);

      // First check if user exists
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email.toLowerCase().trim(),
      });

      if (existingUser) {
        console.log('Found existing user:', existingUser);
        throw new ConflictException('Email already exists');
      }

      const roles = Array.isArray(createUserDto.roles)
        ? createUserDto.roles
        : [Role.USER];
      const permissions = await this.calculateUserPermissions(roles, []);

      // Create a properly typed user data object
      const userData: Partial<User> = {
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
        phone: Number(createUserDto.phone),
        roles,
        permissions,
        skills: [] as UserSkill[],
        desiredSkills: [] as UserDesiredSkill[],
        isEmailVerified: createUserDto.isEmailVerified || false,
      };

      // Add skills if they exist
      if (Array.isArray(createUserDto.skills)) {
        userData.skills = createUserDto.skills.map(
          (skill) =>
            ({
              name: skill.name,
              description: skill.description || '',
              proficiencyLevel: skill.proficiencyLevel,
            }) as UserSkill
        );
      }

      // Add desired skills if they exist
      if (Array.isArray(createUserDto.desiredSkills)) {
        userData.desiredSkills = createUserDto.desiredSkills.map(
          (skill) =>
            ({
              name: skill.name,
              description: skill.description || '',
              desiredProficiencyLevel: skill.desiredProficiencyLevel,
            }) as UserDesiredSkill
        );
      }

      // Create the user document
      const userDoc = await this.userModel.create(userData);

      // Find and return the created user with populated fields
      const createdUser = await this.userModel
        .findById(userDoc._id)
        .select('+skills +desiredSkills')
        .exec();

      if (!createdUser) {
        throw new NotFoundException('User not found after creation');
      }

      return createdUser;
    } catch (error) {
      console.log('Error creating user:', error);
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async getAllSkills() {
    const skills = await this.userSkillModel
      .find()
      .select('name proficiencyLevel')
      .exec();
    return {
      data: skills,
      success: true,
    };
  }

  async findAll(
    pageOrOptions:
      | number
      | {
          page?: number;
          limit?: number;
          search?: string;
          role?: string;
          sortBy?: string;
          sortOrder?: 'asc' | 'desc';
        },
    limitParam?: number,
    searchParam?: string
  ) {
    let page: number,
      limit: number,
      search: string,
      role: string | undefined,
      sortBy: string,
      sortOrder: 'asc' | 'desc';

    // Handle both parameter styles
    if (typeof pageOrOptions === 'object') {
      ({
        page = 1,
        limit = 10,
        search = '',
        role,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pageOrOptions);
    } else {
      page = pageOrOptions || 1;
      limit = limitParam || 10;
      search = searchParam || '';
      sortBy = 'createdAt';
      sortOrder = 'desc';
    }

    const query: any = {};

    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') },
      ];
    }

    if (role) {
      query.roles = role;
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-password')
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      data: users,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async findByNames(name: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ name: name.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ phone: phone.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<UserWithPermissions> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.roles) {
      const permissions = await this.calculateUserPermissions(
        updateUserDto.roles,
        user.permissionGroups as unknown as Types.ObjectId[]
      );
      updateUserDto.permissions = permissions;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .populate('permissionGroups');

    if (!updatedUser) {
      throw new NotFoundException('User update failed, user not found');
    }

    return this.mapUserToDto(updatedUser);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password'
      );
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.password = hashedPassword;
    await user.save();
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async updateRoles(id: string, roles: Role[]): Promise<UserWithPermissions> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.calculateUserPermissions(
      roles,
      user.permissionGroups as unknown as Types.ObjectId[]
    );

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { roles, permissions }, { new: true })
      .populate('permissionGroups');

    if (!updatedUser) {
      throw new NotFoundException('User update failed, user not found');
    }

    return this.mapUserToDto(updatedUser);
  }

  async verifyEmail(id: string): Promise<UserWithPermissions> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isEmailVerified: true }, { new: true })
      .populate('permissionGroups');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
  }
  async activateUser(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    user.isActive = true;
    await user.save();
  
    return user;
  }
  async deactivateUser(id: string, token: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    await user.save();

    // Blacklist the token to immediately log out the user
    this.blacklistService.addToBlacklist(token,3600);  // Example expiration time of 3600 seconds (3 d9ay9)

    return user;
  }

  async markEmailAsVerified(id: string): Promise<UserWithPermissions> {
    return this.verifyEmail(id);
  }

  async getMetrics(): Promise<any> {
    const [totalUsers, verifiedUsers, roleDistribution, recentUsers] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ isVerified: true }),
        this.userModel.aggregate([
          { $unwind: '$roles' },
          { $group: { _id: '$roles', count: { $sum: 1 } } },
        ]),
        this.userModel
          .find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('-password'),
      ]);

    return {
      totalUsers,
      verifiedUsers,
      verificationRate: (verifiedUsers / totalUsers) * 100,
      roleDistribution: roleDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentUsers,
    };
  }

  private async calculateUserPermissions(
    roles: Role[],
    permissionGroupIds: Types.ObjectId[]
  ): Promise<Permission[]> {
    const permissions = new Set<Permission>();

    roles.forEach((role) => {
      const rolePermissions = this.getRolePermissions(role);
      rolePermissions.forEach((permission) => permissions.add(permission));
    });

    if (permissionGroupIds.length > 0) {
      const groups = await this.permissionGroupModel
        .find({
          _id: { $in: permissionGroupIds },
          isActive: true,
        })
        .exec();

      groups.forEach((group) => {
        group.permissions.forEach((permission) => permissions.add(permission));
      });
    }

    return Array.from(permissions);
  }

  private getRolePermissions(role: Role): Permission[] {
    switch (role) {
      case Role.ADMIN:
        return Object.values(Permission);
      case Role.MODERATOR:
        return [
          Permission.READ_USER,
          Permission.UPDATE_USER,
          Permission.VIEW_METRICS,
        ];
      case Role.USER:
        return [Permission.READ_USER];
      default:
        return [];
    }
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .select('+password') // Include password field if needed
      .populate('skills')
      .populate('desiredSkills')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // src/users/users.service.ts
  private mapUserToDto(user: UserDocument): UserWithPermissions {
    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      permissions: user.permissions,
      permissionGroups: user.permissionGroups,
      skills: user.skills || [],
      desiredSkills: user.desiredSkills || [],
    };
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updatePassword(
    userId: string,
    hashedPassword: string
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getSummaryStats() {
    const [total, verified, active] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isEmailVerified: true }),
      this.userModel.countDocuments({ isActive: true }),
    ]);

    return {
      totalUsers: total,
      verifiedUsers: verified,
      activeUsers: active,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      activeRate: total > 0 ? (active / total) * 100 : 0,
    };
  }

  async getUserGrowthStats(period: string = 'month') {
    const formatMap = {
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m',
      year: '%Y',
    };

    return this.userModel.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: formatMap[period] || '%Y-%m',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
          date: { $first: '$createdAt' },
        },
      },
      { $sort: { date: 1 } },
      { $project: { _id: 0, period: '$_id', count: 1 } },
    ]);
  }

  async getSkillStatistics() {
    return this.userModel.aggregate([
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills.name',
          count: { $sum: 1 },
          avgProficiency: {
            $avg: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$skills.proficiencyLevel', 'Beginner'] },
                    then: 1,
                  },
                  {
                    case: { $eq: ['$skills.proficiencyLevel', 'Intermediate'] },
                    then: 2,
                  },
                  {
                    case: { $eq: ['$skills.proficiencyLevel', 'Advanced'] },
                    then: 3,
                  },
                ],
                default: 0,
              },
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          skill: '$_id',
          count: 1,
          avgProficiency: 1,
          _id: 0,
        },
      },
    ]);
  }

  async getVerificationTrends() {
    return this.userModel.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
            },
          },
          total: { $sum: 1 },
          verified: {
            $sum: {
              $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          totalUsers: '$total',
          verifiedUsers: '$verified',
          verificationRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$verified', '$total'] }, 100] },
            ],
          },
          _id: 0,
        },
      },
    ]);
  }

  async getUserActivityStats() {
    return this.userModel.aggregate([
      {
        $facet: {
          lastActive: [
            { $sort: { lastActiveAt: -1 } },
            { $limit: 5 },
            { $project: { name: 1, email: 1, lastActiveAt: 1 } },
          ],
          activityDistribution: [
            {
              $bucket: {
                groupBy: '$lastActiveAt',
                boundaries: [
                  new Date(new Date().setDate(new Date().getDate() - 30)),
                  new Date(new Date().setDate(new Date().getDate() - 7)),
                  new Date(),
                ],
                default: 'inactive',
                output: {
                  count: { $sum: 1 },
                },
              },
            },
          ],
        },
      },
    ]);
  }
}
