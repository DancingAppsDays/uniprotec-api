// src/enrollments/schemas/enrollment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { CourseDate } from '../../course-date/schemas/course-date.schema';
import { Payment } from '../../payments/schemas/payment.schema';

export type EnrollmentDocument = Enrollment & Document;// & { _id: Types.ObjectId };

export enum EnrollmentStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CANCELED = 'canceled',
    COMPLETED = 'completed',
    POSTPONED = 'postponed',
    REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Enrollment {

    _id: string; //TODO test if thisbreaks anything

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CourseDate', required: true })
    courseDate: CourseDate;

    @Prop({ required: true, enum: EnrollmentStatus, default: EnrollmentStatus.PENDING }) // enum: ['confirmed', 'canceled', 'refunded', 'completed']
    status: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment' })
    payment: Payment;

    @Prop()
    certificateUrl: string;

    @Prop()
    feedback: string;

    @Prop()
    feedbackRating: number;

    @Prop({ default: false })
    emailSent: boolean;

    @Prop()
    emailSentDate: Date;

    @Prop({ type: Object })
    metadata: Record<string, any>;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);