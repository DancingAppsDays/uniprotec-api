// src/courses/schemas/postponement-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';

export type PostponementPolicyDocument = PostponementPolicy & Document;

@Schema({ timestamps: true })
export class PostponementPolicy {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
    course: Course;

    @Prop({ required: true, default: 6 })
    minimumRequired: number;

    @Prop({ required: true, default: 2 })
    deadlineDays: number;

    @Prop({ required: true, default: false })
    enableAutoPostponement: boolean;

    @Prop({ required: true, default: true })
    notifyUsers: boolean;

    @Prop()
    customMessage: string;

    @Prop()
    defaultNextCourseDate: Date;
}

export const PostponementPolicySchema = SchemaFactory.createForClass(PostponementPolicy);