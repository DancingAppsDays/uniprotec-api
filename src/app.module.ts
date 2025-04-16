import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailService } from './email/email.service';
import { EmailModule } from './email/email.module';
import { CourseDatesModule } from './course-date/course-date.module';
import { EnrollmentsModule } from './enrollment/enrollment.module';
import { PostponementPolicyModule } from './postponement-policy/postponement-policy.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { AdminModule } from './admin/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    //MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uniprotec?family=4'),
    MongooseModule.forRoot(
      process.env.MONGODB_URIPRO  || '',
     // || `${process.env.MONGODB_URI}?directConnection=true&serverSelectionTimeoutMS=2000`
     {
      connectionFactory: (connection) => {
        console.log('MongoDB URI:', process.env.MONGODB_URIPRO || 'mongodb://127.0.0.1:27017/uniprotec');
        return connection;
      },
    },
    ),
    CoursesModule,
    PaymentsModule,
    UsersModule,
    AuthModule,
    EmailModule,
    CourseDatesModule,
    EnrollmentsModule,
    PostponementPolicyModule,
    ScheduledTasksModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})
export class AppModule { }