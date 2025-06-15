// src/courses/schemas/course-date.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';
import { User } from '../../users/schemas/user.schema';

export type CourseDateDocument = CourseDate & Document;

export enum CourseDateStatus {
    SCHEDULED = 'scheduled',
    CONFIRMED = 'confirmed',
    POSTPONED = 'postponed',
    CANCELED = 'canceled',
    COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Instructor {
    @Prop({ required: true })
    name: string;

    @Prop()
    photoUrl: string;

    @Prop()
    bio: string;

    @Prop([String])
    specialties: string[];
}

export const InstructorSchema = SchemaFactory.createForClass(Instructor);

@Schema({ timestamps: true })
export class CourseDate {


    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
    course: Course;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true, default: 15 })
    capacity: number;

    @Prop({ required: true, default: 0 })
    enrolledCount: number;

    @Prop({ type: InstructorSchema, required: true })
    instructor: Instructor;

    @Prop({ required: true, default: '' })
    location: string;

    @Prop()
    meetingUrl: string;

    @Prop()
    whatsappGroup: string;

    @Prop({ required: true, enum: CourseDateStatus, default: CourseDateStatus.SCHEDULED })
    status: CourseDateStatus;

    @Prop({ required: true, default: 6 })
    minimumRequired: number;

    @Prop({ type: [String] }) // Change to an array of strings
    enrolledUsers: string[];

    @Prop()
    zoomMeetingId: string;

    @Prop()
    zoomPassword: string;

    @Prop()
    notes: string;

    @Prop({ type: Object, default: {} }) // Add this property
    metadata: {
        rescheduledTo?: string;
        postponementReason?: string;
        cancellationReason?: string;
    };


    // NEW PRICING AND PROMOTION FIELDS
    @Prop({ min: 0 })
    overridePrice?: number; // If set, this price overrides the course's base price

    @Prop({ min: 0, max: 100 })
    discountPercentage?: number; // Percentage discount (0-100)

    @Prop({ min: 0 })
    discountAmount?: number; // Fixed amount discount

    @Prop()
    promotionalText?: string; // Text to display for promotions (e.g., "50% OFF Company Purchases!")

    @Prop()
    promotionalBadge?: string; // Short badge text (e.g., "SALE", "LIMITED", "50% OFF")

    @Prop({ default: false })
    isPromotional: boolean; // Flag to easily identify promotional dates

    @Prop()
    promoStartDate?: Date; // When the promotion starts


    // Add _id explicitly
    _id: string;
}

export const CourseDateSchema = SchemaFactory.createForClass(CourseDate);