import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    //MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uniprotec?family=4'),
    MongooseModule.forRoot(
      // process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/uniprotec?directConnection=true&serverSelectionTimeoutMS=2000'),
    CoursesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }