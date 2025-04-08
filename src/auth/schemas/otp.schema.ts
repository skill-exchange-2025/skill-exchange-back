import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OTP {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  expiresAt: Date;
  
  @Prop({ default: false })
  used: boolean;
}

export type OTPDocument = OTP & Document;
export const OTPSchema = SchemaFactory.createForClass(OTP);