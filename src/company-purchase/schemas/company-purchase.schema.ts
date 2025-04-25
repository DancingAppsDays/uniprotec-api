
// src/company-purchase/schemas/company-purchase.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';

export type CompanyPurchaseDocument = CompanyPurchase & Document;

export enum CompanyPurchaseStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  PAYMENT_PENDING = 'payment_pending',
  PAID = 'paid',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

@Schema({ timestamps: true })
export class CompanyPurchase {
  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  rfc: string;

  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true })
  contactEmail: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
  course: Course;

  @Prop({ required: true })
  courseTitle: string;

  @Prop({ required: true })
  selectedDate: Date;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop()
  additionalInfo: string;

  @Prop({ 
    required: true, 
    enum: CompanyPurchaseStatus, 
    default: CompanyPurchaseStatus.PENDING 
  })
  status: CompanyPurchaseStatus;

  @Prop()
  requestId: string;

  @Prop({ type: [String], default: [] })
  enrollmentIds: string[];

  @Prop()
  adminNotes: string;

  @Prop()
  paymentMethod: string;

  @Prop()
  paymentReference: string;

  @Prop()
  paymentDate: Date;

  @Prop()
  paymentAmount: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const CompanyPurchaseSchema = SchemaFactory.createForClass(CompanyPurchase);