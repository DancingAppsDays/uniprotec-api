import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { MongooseModule } from '@nestjs/mongoose';

import { PaymentsModule } from './payments/payments.module';
@Module({
  imports: [CoursesModule, PaymentsModule,
    MongooseModule.forRoot('mongodb://localhost/uniprotec'),

  ],
  controllers: [AppController, PaymentsController],
  providers: [AppService, PaymentsService],
})
export class AppModule { }
