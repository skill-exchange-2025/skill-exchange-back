import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  SetMetadata,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/user.decorator';
import { User } from '../users/schemas/user.schema';
import { Roles } from './decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { InitiateResetPasswordDto } from './dto/reset-password.dto';
import { CompleteResetPasswordDto } from './dto/reset-password.dto';


export const Public = () => SetMetadata('isPublic', true);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // Add this decorator to make the endpoint public
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: InitiateResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto.email);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 408, description: 'Phone number already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    console.log('registerDto', registerDto);
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard) // Protect the route with the JWT guard
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User): User {
    return user; // Return the current authenticated user
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getProfile(@CurrentUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
  @Post('verify-otp')
  @Public()

  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async verifyOTP(@Body() verifyOtpDto: VerifyOtpDto) {
    return await this.authService.verifyOTP(
      verifyOtpDto.email,
      verifyOtpDto.otp
    );
  }

  @Get('verify-email')
  @Public()
  async verifyEmail(@Query('token') token: string) {
    try {
      const result = await this.authService.verifyEmail(token);
      return result;

    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async initiateResetPassword(
    @Body() resetPasswordDto: InitiateResetPasswordDto
  ) {
    return await this.authService.resetPassword(resetPasswordDto.email);
  }

  @Post('complete-reset-password')
  @Public()
  @ApiOperation({ summary: 'Complete password reset' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async completeResetPassword(
    @Body() completeResetPasswordDto: CompleteResetPasswordDto
  ) {
    return await this.authService.completeResetPassword(
      completeResetPasswordDto
    );
  }

}
