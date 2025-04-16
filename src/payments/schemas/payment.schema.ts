// src/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {

    @Prop({ type: String })
    _id: string;

    @Prop({ type: String })
    userId?: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 'mxn' })
    currency: string;

    @Prop({ required: true })
    status: string;

    @Prop({ required: true })
    stripeSessionId: string;

    @Prop()
    stripePaymentIntentId?: string;

    @Prop()
    customerEmail?: string;

    @Prop()
    customerName?: string;

    @Prop({ type: Date })
    selectedDate?: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course' })
    course: Course;

    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);