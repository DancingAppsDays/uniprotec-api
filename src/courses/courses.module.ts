// src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course, CourseSchema } from './schemas/course.schema';
import { CourseDate, CourseDateSchema } from '../course-date/schemas/course-date.schema';
import { PostponementPolicy, PostponementPolicySchema } from '../postponement-policy/schemas/postponement-policy.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: CourseDate.name, schema: CourseDateSchema },
      { name: PostponementPolicy.name, schema: PostponementPolicySchema },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule { }