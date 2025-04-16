// src/courses/schemas/course.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
//import { Instructor, InstructorSchema } from './course-date.schema';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {

    // Add _id explicitly
    _id: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    subtitle: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    duration: string;

    @Prop([String])
    isoStandards: string[];

    @Prop()
    previewVideoUrl: string;

    @Prop()
    imageUrl: string;

    @Prop({ default: false })
    featured: boolean;

    //  @Prop({ type: InstructorSchema, required: true })
    //  instructor: Instructor;

    @Prop({ type: Object })
    postponementPolicy: {
        minimumRequired: number;
        deadlineDays: number;
        message: string;
    };
}

export const CourseSchema = SchemaFactory.createForClass(Course);