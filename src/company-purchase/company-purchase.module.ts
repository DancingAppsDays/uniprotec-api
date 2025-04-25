// src/company-purchase/company-purchase.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyPurchaseController } from './company-purchase.controller';
import { CompanyPurchaseService } from './company-purchase.service';
import { CompanyPurchase, CompanyPurchaseSchema } from './schemas/company-purchase.schema';
import { CoursesModule } from '../courses/courses.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyPurchase.name, schema: CompanyPurchaseSchema },
    ]),
    CoursesModule,
    EmailModule,
  ],
  controllers: [CompanyPurchaseController],
  providers: [CompanyPurchaseService],
  exports: [CompanyPurchaseService],
})
export class CompanyPurchaseModule {}