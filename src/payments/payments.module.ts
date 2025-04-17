// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { CoursesModule } from '../courses/courses.module';
import { EmailModule } from '../email/email.module';
import { CourseDatesModule } from '../course-date/course-date.module';
import { EnrollmentsModule } from '../enrollment/enrollment.module';
import { CourseDate, CourseDateSchema } from 'src/course-date/schemas/course-date.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: CourseDate.name, schema: CourseDateSchema },
    ]),
    CoursesModule,
    EmailModule,
    CourseDatesModule,
    EnrollmentsModule,
    CourseDatesModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }