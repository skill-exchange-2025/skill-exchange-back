import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PermissionGroup,
  PermissionGroupDocument,
} from '../schemas/permission-group.schema';
import { CreatePermissionGroupDto } from '../dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from '../dto/update-permission-group.dto';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

@Injectable()
export class PermissionGroupsService {
  constructor(
    @InjectModel(PermissionGroup.name)
    private permissionGroupModel: Model<PermissionGroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  async create(
    createDto: CreatePermissionGroupDto
  ): Promise<PermissionGroupDocument> {
    try {
      const group = new this.permissionGroupModel(createDto);
      return await group.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Permission group name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<PermissionGroupDocument[]> {
    return this.permissionGroupModel.find().exec();
  }

  async findOne(id: string): Promise<PermissionGroupDocument> {
    const group = await this.permissionGroupModel.findById(id).exec();
    if (!group) {
      throw new NotFoundException('Permission group not found');
    }
    return group;
  }

  async update(
    id: string,
    updateDto: UpdatePermissionGroupDto
  ): Promise<PermissionGroupDocument> {
    const group = await this.permissionGroupModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    return group;
  }

  async remove(id: string): Promise<void> {
    const group = await this.permissionGroupModel.findById(id).exec();
    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    // Remove group from all users
    await this.userModel.updateMany(
      { permissionGroups: id },
      { $pull: { permissionGroups: id } }
    );

    await group.deleteOne();
  }

  async assignToUser(userId: string, groupId: string): Promise<void> {
    const [user, group] = await Promise.all([
      this.userModel.findById(userId),
      this.permissionGroupModel.findById(groupId),
    ]);

    if (!user || !group) {
      throw new NotFoundException('User or permission group not found');
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (!user.permissionGroups.includes(group._id)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      user.permissionGroups.push(group._id.toString());

      user.permissions = this.mergePermissions(
        user.permissions,
        group.permissions
      );
      await user.save();
    }
  }

  async removeFromUser(userId: string, groupId: string): Promise<void> {
    const [user, group] = await Promise.all([
      this.userModel.findById(userId),
      this.permissionGroupModel.findById(groupId),
    ]);

    if (!user || !group) {
      throw new NotFoundException('User or permission group not found');
    }

    user.permissionGroups = user.permissionGroups.filter(
      (_id) => _id.toString() !== groupId
    );

    // Recalculate permissions
    const permissions = new Set<Permission>();

    // Add role-based permissions
    user.roles.forEach((role) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      permissions.add(...this.getDefaultPermissions(role));
    });

    // Add permissions from remaining groups
    await Promise.all(
      user.permissionGroups.map(async (groupId) => {
        const group = await this.permissionGroupModel.findById(groupId);
        if (group && group.isActive) {
          group.permissions.forEach((perm) => permissions.add(perm));
        }
      })
    );

    user.permissions = Array.from(permissions);
    await user.save();
  }

  private mergePermissions(
    userPerms: Permission[],
    groupPerms: Permission[]
  ): Permission[] {
    return Array.from(new Set([...userPerms, ...groupPerms]));
  }

  private getDefaultPermissions(role: Role): Permission[] {
    switch (role) {
      case Role.ADMIN:
        return [
          Permission.READ_USER,
          Permission.CREATE_USER,
          Permission.UPDATE_USER,
          Permission.DELETE_USER,
          Permission.MANAGE_ROLES,
          Permission.VIEW_METRICS,
        ];
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
}
