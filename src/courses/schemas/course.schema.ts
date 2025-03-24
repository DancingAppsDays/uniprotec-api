import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema()
export class Course {
    @Prop({ required: true })
    title: string;

    @Prop()
    subtitle: string;

    // Add other properties with @Prop decorators
}

export const CourseSchema = SchemaFactory.createForClass(Course);