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
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ProfileModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
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
