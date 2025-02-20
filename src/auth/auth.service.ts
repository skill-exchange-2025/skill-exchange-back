import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from './enums/role.enum';
import { Permission } from './enums/permission.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Model, ObjectId } from 'mongoose';
import { OTP, OTPDocument } from './schemas/otp.schema';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JsonWebTokenError } from 'jsonwebtoken';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(OTP.name) private otpModel: Model<OTPDocument>,
    private mailerService: MailerService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}
  
   // Add this method
  async resetPassword(email: string) {
    try {
      // Check if user exists
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP to database
      await this.otpModel.create({
        email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
        used: false,
      });

      // Send email with OTP
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <h1>Password Reset Request</h1>
          <p>Your OTP for password reset is: 
          
          <strong>${otp}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      return {
        message: 'OTP sent successfully to your email',
        success: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to process reset password request');
    }
  }
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const rawPassword = registerDto.password.trim();
    console.log('🔑 Raw Password (Registration):', `"${rawPassword}"`);
    const normalizedEmail = registerDto.email.toLowerCase().trim();
    console.log('Generated hash:', hashedPassword);

    const name = registerDto.name;
    const phone = registerDto.phone;
    const roles = (registerDto.roles || [Role.USER]).map((role: string) =>
      role.toLowerCase()
    ) as Role[];
    const permissions = this.getDefaultPermissions(roles);

    const user = await this.usersService.create({
      ...registerDto,
      name,
      phone,
      email: normalizedEmail,
      password: hashedPassword,
      roles,
      permissions,
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        _id: (user._id as any).toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        _id: (user._id as ObjectId).toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user);

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          _id: (user._id as ObjectId).toString(),
          name: user.name,
          phone: user.phone,
          email: user.email,
          roles: user.roles || [],
          permissions: user.permissions || [],
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: UserDocument) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    });
  }

  private async generateRefreshToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id,
      email: user.email,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
    });
  }

  private getDefaultPermissions(roles: Role[]): Permission[] {
    const permissions = new Set<Permission>();

    roles.forEach((role) => {
      switch (role) {
        case Role.ADMIN:
          Object.values(Permission).forEach((permission) =>
            permissions.add(permission)
          );
          break;
        case Role.MODERATOR:
          permissions.add(Permission.READ_USER);
          permissions.add(Permission.UPDATE_USER);
          permissions.add(Permission.VIEW_METRICS);
          break;
        case Role.USER:
          permissions.add(Permission.READ_USER);
          break;
      }
    });

    return Array.from(permissions);
  }

  private async validateUser(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      console.log('❌ User not found:', normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('🔑 Stored hash:', user.password);
    console.log('🔑 Input password:', password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', isMatch);

    if (!isMatch) return null;
    return user;
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const otpRecord = await this.otpModel.findOne({
      email,
      otp,
      used: false,
      expiresAt: { $gt: new Date() }
    });
  
    if (!otpRecord) {
      return false;
    }
  
    // Mark OTP as used
    await this.otpModel.findByIdAndUpdate(otpRecord._id, { used: true });
  
    return true;
  }

  
  private async validateOTP(token: string, otp: string): Promise<boolean> {
    try {
      const otpRecord = await this.otpModel.findOne({ token });
      
      if (!otpRecord) {
        throw new UnauthorizedException('Invalid token');
      }

      if (otpRecord.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      if (otpRecord.expiresAt && otpRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('OTP has expired');
      }

      if (otpRecord.used) {
        throw new UnauthorizedException('OTP has already been used');
      }

      await this.otpModel.findByIdAndUpdate(otpRecord._id, { used: true });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error validating OTP');
    }
  }

  
}
