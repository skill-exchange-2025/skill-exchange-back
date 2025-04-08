import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { Role } from './enums/role.enum';
import { Permission } from './enums/permission.enum';
import { PermissionGroupsService } from './services/permission-groups.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';

@ApiTags('permission-groups')
@ApiBearerAuth()
@Controller('permission-groups')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionGroupsController {
  constructor(
    private readonly permissionGroupsService: PermissionGroupsService
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Create permission group' })
  create(@Body() createDto: CreatePermissionGroupDto) {
    return this.permissionGroupsService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Permissions(Permission.READ_USER)
  @ApiOperation({ summary: 'Get all permission groups' })
  findAll() {
    return this.permissionGroupsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Permissions(Permission.READ_USER)
  @ApiOperation({ summary: 'Get permission group by id' })
  findOne(@Param('id') id: string) {
    return this.permissionGroupsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Update permission group' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePermissionGroupDto) {
    return this.permissionGroupsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Delete permission group' })
  remove(@Param('id') id: string) {
    return this.permissionGroupsService.remove(id);
  }

  @Post('assign/:userId/:groupId')
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Assign permission group to user' })
  assignToUser(
    @Param('userId') userId: string,
    @Param('groupId') groupId: string
  ) {
    return this.permissionGroupsService.assignToUser(userId, groupId);
  }

  @Delete('remove/:userId/:groupId')
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Remove permission group from user' })
  removeFromUser(
    @Param('userId') userId: string,
    @Param('groupId') groupId: string
  ) {
    return this.permissionGroupsService.removeFromUser(userId, groupId);
  }
}
