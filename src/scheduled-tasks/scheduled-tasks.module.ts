// src/scheduled-tasks/scheduled-tasks.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { CourseDatesModule } from '../course-date/course-date.module';
import { EnrollmentsModule } from '../enrollment/enrollment.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CourseDatesModule,
    EnrollmentsModule,
    EmailModule,
  ],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule { }