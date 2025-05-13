import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WheelSpin, WheelSpinDocument } from './schemas/wheel-spin.schema';
import { Model, Types } from 'mongoose';
import { PaymentService } from '../marketplace/services/payment.service';

export interface WheelSpinResponse {
  credits: number;
  prizeIndex: number;
  message: string;
  prize: string;
}

@Injectable()
export class WheelService {
  constructor(
    @InjectModel(WheelSpin.name)
    private readonly wheelSpinModel: Model<WheelSpinDocument>,
    private readonly paymentService: PaymentService
  ) {}

  private readonly COOLDOWN_HOURS = 0;
  private readonly WHEEL_PRIZES = [
    { credits: 50, option: '50 Credits' },
    { credits: 10, option: '10 Credits' },
    { credits: 20, option: '20 Credits' },
    { credits: 5, option: '5 Credits' },
    { credits: 30, option: '30 Credits' },
    { credits: 15, option: '15 Credits' },
    { credits: 25, option: '25 Credits' },
    { credits: 40, option: '40 Credits' },
  ];

  async spinWheel(userId: string): Promise<WheelSpinResponse> {
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

    // Generate random prize index
    const prizeIndex = Math.floor(Math.random() * this.WHEEL_PRIZES.length);
    const selectedPrize = this.WHEEL_PRIZES[prizeIndex];

    // Create the wheel spin document
    const wheelSpinData = {
      userId: userObjectId,
      credits: selectedPrize.credits,
      prizeIndex,
      spinTime: new Date(),
    };

    // Save the spin record
    const wheelSpin = await this.wheelSpinModel.create(wheelSpinData);

    // Add credits to user's wallet
    await this.paymentService.addFundsToWallet(
      userId,
      selectedPrize.credits,
      'wheel_spin',
      wheelSpin._id.toString()
    );

    return {
      credits: selectedPrize.credits,
      prizeIndex,
      message: `Congratulations! You won ${selectedPrize.credits} credits!`,
      prize: selectedPrize.option,
    };
  }

  async getLastSpinTime(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const lastSpin = await this.wheelSpinModel
      .findOne({ userId: userObjectId })
      .sort({ spinTime: -1 });

    return {
      lastSpinTime: lastSpin?.spinTime || null,
      canSpin:
        !lastSpin ||
        (Date.now() - lastSpin.spinTime.getTime()) / (1000 * 60 * 60) >=
          this.COOLDOWN_HOURS,
    };
  }
}
