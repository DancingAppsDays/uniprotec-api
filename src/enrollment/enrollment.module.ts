
// src/enrollments/enrollments.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsController } from './enrollment.controller';
import { EnrollmentsService } from './enrollment.service';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { CourseDate, CourseDateSchema } from '../course-date/schemas/course-date.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { CourseDatesModule } from '../course-date/course-date.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: CourseDate.name, schema: CourseDateSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CourseDatesModule,
    EmailModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule { }