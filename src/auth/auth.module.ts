import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PermissionGroup,
  PermissionGroupSchema,
} from './schemas/permission-group.schema';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { OTP, OTPSchema } from './schemas/otp.schema';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { Wallet, WalletSchema } from '../marketplace/schemas/wallet.schema';
import { BlacklistService } from 'src/blacklist/blacklist/blacklist.service';
import { InfobipService } from 'src/infobip/infobip.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    UsersModule, // Ensure UsersModule is imported so AuthService can use UsersService
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'defaultSecret',
        signOptions: {
          expiresIn: '12h',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: PermissionGroup.name, schema: PermissionGroupSchema },
      { name: User.name, schema: UserSchema },
      { name: OTP.name, schema: OTPSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    MarketplaceModule, // Import MarketplaceModule to have access to the Wallet model
  ],
  controllers: [AuthController],
  providers: [JwtModule, AuthService, JwtStrategy,BlacklistService,InfobipService,JwtAuthGuard],
  exports: [AuthService,JwtAuthGuard],
})
export class AuthModule {}
