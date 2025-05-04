import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { WheelController } from './wheel.controller';
import { WheelService } from './wheel.service';
import { WheelSpin, WheelSpinSchema } from './schemas/wheel-spin.schema';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WheelSpin.name, schema: WheelSpinSchema },
    ]),
    UsersModule,
    MarketplaceModule,
  ],
  controllers: [WheelController],
  providers: [WheelService],
})
export class WheelModule {}
