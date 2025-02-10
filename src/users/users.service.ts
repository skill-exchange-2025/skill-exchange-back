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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PermissionGroup.name)
    private permissionGroupModel: Model<PermissionGroupDocument>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      // Password should be pre-hashed by AuthService - remove local hashing
      const roles = createUserDto.roles || [Role.USER];
      const permissions = await this.calculateUserPermissions(roles, []);

      const user = new this.userModel({
        ...createUserDto,
        roles,
        permissions,
      });

      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ users: UserWithPermissions[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (search) {
      query.email = new RegExp(search, 'i');
    }

    const [users, total]: [UserDocument[], number] = await Promise.all([
      this.userModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('permissionGroups')
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      users: users.map((user) => this.mapUserToDto(user)),
      total,
    };
  }

  async findById(id: string): Promise<UserWithPermissions> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .populate('permissionGroups')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
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
      .findByIdAndUpdate(id, { isVerified: true }, { new: true })
      .populate('permissionGroups');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
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

  private mapUserToDto(user: UserDocument): UserWithPermissions {
    return {
      id: user.id.toString(),
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      permissionGroups: user.permissionGroups,
    };
  }
}