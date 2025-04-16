// src/course-dates/course-dates.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseDatesController } from './course-date.controller';
import { CourseDatesService } from './course-date.service';
import { CourseDate, CourseDateSchema } from './schemas/course-date.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { PostponementPolicy, PostponementPolicySchema } from '../postponement-policy/schemas/postponement-policy.schema';
import { CoursesModule } from '../courses/courses.module';
import { EmailModule } from '../email/email.module';
import { User, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseDate.name, schema: CourseDateSchema },
      { name: Course.name, schema: CourseSchema },
      { name: PostponementPolicy.name, schema: PostponementPolicySchema },
      { name: User.name, schema: UserSchema },
    ]),
    CoursesModule,
    EmailModule,
  ],
  controllers: [CourseDatesController],
  providers: [CourseDatesService],
  exports: [CourseDatesService],
})
export class CourseDatesModule { }