// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CoursesModule } from '../../courses/courses.module';
import { CourseDatesModule } from '../../course-date/course-date.module';
import { EnrollmentsModule } from '../../enrollment/enrollment.module';
import { PaymentsModule } from '../../payments/payments.module';
import { UsersModule } from '../../users/users.module';
import { EmailModule } from '../../email/email.module';
import { CompanyPurchaseModule } from 'src/company-purchase/company-purchase.module';

@Module({
  imports: [
    CoursesModule,
    CourseDatesModule,
    EnrollmentsModule,
    PaymentsModule,
    UsersModule,
    EmailModule,
    CompanyPurchaseModule,
  ],
  controllers: [AdminController],
})
export class AdminModule { }