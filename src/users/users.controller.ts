import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/enums/role.enum';
import { Permission } from '../auth/enums/permission.enum';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Permissions(Permission.READ_USER)
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('metrics')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async getMetrics() {
    return await this.usersService.getMetrics();
  }

  @Post('change-role')
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_ROLES)
  async changeUserRole(@Body() body: { userId: string; roles: Role[] }) {
    return await this.usersService.updateRoles(body.userId, body.roles);
  }
}
