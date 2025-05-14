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
  Patch,
  Req,
  UnauthorizedException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/auth.controller';

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
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in email and name',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by role',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const options = {
      page,
      limit,
      search,
      role,
      sortBy,
      sortOrder,
    };

    return await this.usersService.findAll(options);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
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

  @Get('skills')
  @Public() // Make it public or specify required roles
  async getAllSkills() {
    return await this.usersService.getAllSkills();
  }
  @Post(':id/activate')
  @Roles(Role.ADMIN)
  async activateUser(@Param('id') id: string) {
    return await this.usersService.activateUser(id);
  }
  
  @Patch('deactivate/:id')
  async deactivate(@Param('id') id: string, @Req() req: Request) {
    const token = req.headers['authorization']?.split(' ')[1];  
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    return await this.usersService.deactivateUser(id, token);
  }


  @Get('stats/summary')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async getSummaryStats() {
    return this.usersService.getSummaryStats();
  }

  @Get('stats/growth')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month', 'year'],
    required: false,
    description: 'Time period for growth metrics',
  })
  async getUserGrowth(@Query('period') period: string = 'month') {
    return this.usersService.getUserGrowthStats(period);
  }

  @Get('stats/skills')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async getSkillStats() {
    return this.usersService.getSkillStatistics();
  }

  @Get('stats/verification-trends')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async getVerificationTrends() {
    return this.usersService.getVerificationTrends();
  }

  @Get('stats/activity')
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_METRICS)
  async getUserActivity() {
    return this.usersService.getUserActivityStats();
  }
}
