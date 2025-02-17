import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from './enums/role.enum';
import { Permission } from './enums/permission.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ObjectId } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

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
}
