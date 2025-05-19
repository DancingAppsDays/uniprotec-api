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

    // @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
    // enrolledUsers: User[];

    //CLaude verify this, 
    /*
    
src/course-date/course-date.service.ts:236:71 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'User'.

236     if (courseDate.enrolledUsers && courseDate.enrolledUsers.includes(userId)) {
    */
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


    // Add _id explicitly
    _id: string;
}

export const CourseDateSchema = SchemaFactory.createForClass(CourseDate);