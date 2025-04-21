import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';
import { ProfileModule } from './profile/profile.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MessagingModule } from './messaging/messaging.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ProfileModule,
    MessagingModule,
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    MarketplaceModule,
    FeedbackModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        }),
      ],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost/nest'),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST') || 'smtp.gmail.com',
          port: configService.get('MAIL_PORT') || 587,
          secure: false,
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"${configService.get('APP_NAME', 'SKILLY')}" <${configService.get('MAIL_USER')}>`,
        },
      }),
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, JwtModule],
})
export class AppModule {}
