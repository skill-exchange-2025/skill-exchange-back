import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { InfobipService } from './infobip/infobip.service';
import { InfobipController } from './infobip/infobip.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost/nest'),
  ],
  controllers: [AppController, AuthController, InfobipController],
  providers: [AppService, JwtModule, InfobipService],
})
export class AppModule {}
