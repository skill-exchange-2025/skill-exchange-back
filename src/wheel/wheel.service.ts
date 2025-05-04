import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WheelSpin, WheelSpinDocument } from './schemas/wheel-spin.schema';
import { Model, Types } from 'mongoose'; // Add Types import
import { PaymentService } from '../marketplace/services/payment.service';

@Injectable()
export class WheelService {
  constructor(
      @InjectModel(WheelSpin.name)
      private readonly wheelSpinModel: Model<WheelSpinDocument>,
      private readonly paymentService: PaymentService
  ) {}

  private readonly COOLDOWN_HOURS = 24;
  private readonly POSSIBLE_PRIZES = [5, 10, 15, 20, 25, 30, 40, 50];

  async spinWheel(userId: string): Promise<{
    prize: string;
    credits: number;
    message: string;
  }> {
    // Convert userId string to ObjectId
    const userObjectId = new Types.ObjectId(userId);

    // Check last spin time
    const lastSpin = await this.wheelSpinModel
        .findOne({ userId: userObjectId })
        .sort({ spinTime: -1 });

    if (lastSpin) {
      const hoursSinceLastSpin =
          (Date.now() - lastSpin.spinTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSpin < this.COOLDOWN_HOURS) {
        throw new BadRequestException('You can only spin once every 24 hours!');
      }
    }

    // Generate random prize
    const prizeIndex = Math.floor(Math.random() * this.POSSIBLE_PRIZES.length);
    const credits = this.POSSIBLE_PRIZES[prizeIndex];

    // Create the wheel spin document
    const wheelSpinData = {
      userId: userObjectId,
      credits,
      spinTime: new Date(),
    };

    // Create and save the document
    const wheelSpin = await this.wheelSpinModel.create(wheelSpinData);

    // Add funds to wallet using the document's _id
    await this.paymentService.addFundsToWallet(
        userId,
        credits,
        'wheel_spin' as any, // Type assertion needed since PaymentService doesn't have wheel_spin type yet
        wheelSpin._id.toString()
    );

    return {
      prize: `${credits} Credits`,
      credits,
      message: `Congratulations! You won ${credits} credits!`,
    };
  }

  async getLastSpinTime(
      userId: string
  ): Promise<{ lastSpinTime: string | null }> {
    const userObjectId = new Types.ObjectId(userId);

    const lastSpin = await this.wheelSpinModel
        .findOne({ userId: userObjectId })
        .sort({ spinTime: -1 });

    return {
      lastSpinTime: lastSpin ? lastSpin.spinTime.toISOString() : null,
    };
  }
}