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
import { JsonWebTokenError } from 'jsonwebtoken';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteResetPasswordDto } from './dto/reset-password.dto';
import { ReferralDto } from './dto/referral.dto';
import * as mongoose from 'mongoose';
import { Wallet, WalletDocument } from '../marketplace/schemas/wallet.schema';
import { BlacklistService } from 'src/blacklist/blacklist/blacklist.service';
import { InfobipService } from 'src/infobip/infobip.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(OTP.name) private otpModel: Model<OTPDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private mailerService: MailerService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly blacklistService: BlacklistService,
    private readonly infobipService: InfobipService,
  ) {}

   async findAllUsers() {
      return this.userModel
        .find()
        .select('-password')
        .exec();
    }

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
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="text-align: center; color: #4CAF50;">Password Reset Request</h1>
            <p style="text-align: center; font-size: 16px;">
              You have requested to reset your password. Please use the OTP below to proceed.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="
                display: inline-block;
                padding: 10px 20px;
                font-size: 24px;
                font-weight: bold;
                color: #ffffff;
                background-color: #4CAF50;
                border-radius: 8px;
              ">
                ${otp}
              </span>
            </div>
            <p style="text-align: center; font-size: 16px;">
              This OTP will expire in <strong>10 minutes</strong>.
            </p>
            <p style="text-align: center; font-size: 16px;">
              If you did not request this password reset, please ignore this email.
            </p>
          </div>
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
      isEmailVerified: false,
    });

    // Send SMS notification to you (the admin) with the user's name
    await this.infobipService.sendSMS(name,normalizedEmail);  

    // Generate JWT token for email verification
    const verificationToken = this.jwtService.sign(
      { email: normalizedEmail },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '1h', // Adjust expiration as needed
      }
    );
    // Generate verification link
    const verificationLink = `${this.configService.get<string>(
      'FRONTEND_URL'
    )}/verify-email?token=${verificationToken}`;
    // Send verification email
    await this.mailerService.sendMail({
      to: normalizedEmail,
      subject: 'Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h1 style="text-align: center; color: #4CAF50;">Verify Your Email</h1>
          <p style="text-align: center; font-size: 16px;">
            Thank you for registering! Please click the button below to verify your email.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationLink}" 
               style="
                 display: inline-block;
                 padding: 12px 24px;
                 font-size: 16px;
                 font-weight: bold;
                 color: #ffffff;
                 background-color: #4CAF50;
                 border-radius: 8px;
                 text-decoration: none;
               "
            >
              Verify Email
            </a>
          </div>
          <p style="text-align: center; font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            ${verificationLink}
          </p>
        </div>
      `,
    });

    // Return auth response
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
        skills: user.skills,
        desiredSkills: user.desiredSkills,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }





  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in'
      );
    }
    // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedException('Account is deactivated');
  }

  // Generate tokens (access and refresh tokens)
  const { accessToken, refreshToken } = await this.generateTokens(user);

  // Check if the generated access token is blacklisted
  const tokenBlacklisted = await this.blacklistService.isBlacklisted(accessToken);
  if (tokenBlacklisted) {
    throw new UnauthorizedException('Your session has been invalidated');
  }
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
        isEmailVerified: user.isEmailVerified,
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

  async verifyOTP(email: string, otp: string) {
    try {
      const otpRecord = await this.otpModel.findOne({
        email,
        otp,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        return { valid: false };
      }

      // Generate a temporary token for the password reset
      const token = this.jwtService.sign(
        { email, otp },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: '10m',
        }
      );

      return {
        valid: true,
        token, // Return token to be used in the final step
      };
    } catch (error) {
      throw new BadRequestException('Failed to verify OTP');
    }
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

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.usersService.findByEmail(payload.email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      await this.usersService.markEmailAsVerified(user.id);

      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }
  }

  async completeResetPassword(
    completeResetPasswordDto: CompleteResetPasswordDto
  ) {
    const { email, otp, password } = completeResetPasswordDto;

    try {
      // Verify OTP one last time
      const otpRecord = await this.otpModel.findOne({
        email,
        otp,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Find user
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      await this.userModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
      });

      // Mark OTP as used
      await this.otpModel.findByIdAndUpdate(otpRecord._id, { used: true });

      return {
        message: 'Password reset successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Process a referral and reward the referrer with credits
   * @param userId The ID of the new user
   * @param referralDto The referral data containing the referrer's email
   * @returns A message indicating the result of the referral process
   */
  async processReferral(
    userId: string | null,
    referralDto: ReferralDto
  ): Promise<{ message: string }> {
    try {
      // Check if the referrer exists
      const referrer = await this.userModel.findOne({
        email: referralDto.referrerEmail.toLowerCase().trim(),
      });

      if (!referrer) {
        return { message: 'Thank you for your feedback!' };
      }

      // If userId is provided, check for self-referrals
      if (userId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
          return { message: 'Thank you for your feedback!' };
        }

        if (
          user.email.toLowerCase() === referralDto.referrerEmail.toLowerCase()
        ) {
          return { message: 'Thank you for your feedback!' };
        }
      }

      // Get the referrer's wallet
      let wallet = await this.walletModel.findOne({ user: referrer._id });

      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await this.walletModel.create({
          user: referrer._id,
          balance: 0,
          transactions: [],
        });
      }

      // Add 5 credits to the referrer's wallet
      const REFERRAL_REWARD = 5;
      wallet.balance += REFERRAL_REWARD;
      wallet.transactions.push({
        amount: REFERRAL_REWARD,
        type: 'referral',
        description: 'Referral reward',
        timestamp: new Date(),
        reference: userId ? `referral:${userId}` : 'referral:anonymous',
      });

      await wallet.save();

      // Send email notification to the referrer
      await this.mailerService.sendMail({
        to: referrer.email,
        subject: 'You received a referral reward!',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="text-align: center; color: #4CAF50;">Referral Reward</h1>
            <p style="text-align: center; font-size: 16px;">
              Good news! Someone signed up using your referral and you've received ${REFERRAL_REWARD} 🪙 in your wallet.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <p>Thank you for helping our community grow!</p>
            </div>
          </div>
        `,
      });

      return { message: 'Referral processed successfully' };
    } catch (error) {
      console.error('Error processing referral:', error);
      return { message: 'Thank you for your feedback!' };
    }
  }
}
