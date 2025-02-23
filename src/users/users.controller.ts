import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/enums/role.enum';
import { Permission } from '../auth/enums/permission.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.CREATE_USER)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Permissions(Permission.READ_USER)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
      @Query('page') page?: number,
      @Query('limit') limit?: number,
      @Query('search') search?: string
  ) {
    return await this.usersService.findAll(page, limit, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Permissions(Permission.READ_USER)
  async findOne(@Param('id') id: string) {
    return await this.usersService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_USER)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.DELETE_USER)
  async remove(@Param('id') id: string) {
    return await this.usersService.delete(id);
  }

  @Post(':id/change-password')
  @Roles(Role.ADMIN, Role.USER)
  @Permissions(Permission.UPDATE_USER)
  async changePassword(
      @Param('id') id: string,
      @Body() changePasswordDto: ChangePasswordDto
  ) {
    return await this.usersService.changePassword(id, changePasswordDto);
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
    if (!body.userId || !body.roles) {
      throw new BadRequestException('userId and roles are required');
    }
    return await this.usersService.updateRoles(body.userId, body.roles);
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async verifyUser(@Param('id') id: string) {
    return await this.usersService.verifyEmail(id);
  }
}