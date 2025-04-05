import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  fullName: string;

  @Prop()
  phone: string;

  @Prop()
  passwordHash: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: [String], default: [] })
  roles: string[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  // Add _id explicitly
  _id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);