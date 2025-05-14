import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CodingRoomsController } from './codingrooms.controller';
import { CodingRoomsService } from './codingrooms.service';
import { CodingRoomGateway } from './gateways/codingroom.gateway';
import { CodingRoom, CodingRoomSchema } from './schemas/codingroom.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CodingRoom.name, schema: CodingRoomSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '1d'),
        },
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [CodingRoomsController],
  providers: [CodingRoomsService, CodingRoomGateway],
  exports: [CodingRoomsService],
})
export class CodingRoomsModule {}
