// src/company-purchase/company-purchase.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanyPurchase, CompanyPurchaseDocument, CompanyPurchaseStatus } from './schemas/company-purchase.schema';
import { CreateCompanyPurchaseDto } from './dto/create-company-purchase.dto';
import { UpdateCompanyPurchaseDto } from './dto/update-company-purchase.dto';
import { CoursesService } from '../courses/courses.service';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

import axios from 'axios';


@Injectable()
export class CompanyPurchaseService {
  constructor(
    @InjectModel(CompanyPurchase.name) private companyPurchaseModel: Model<CompanyPurchaseDocument>,
    private coursesService: CoursesService,
    private emailService: EmailService,
  ) {}

  async create(createCompanyPurchaseDto: CreateCompanyPurchaseDto): Promise<CompanyPurchase> {
    // Check if course exists
    try {
      await this.coursesService.findOne(createCompanyPurchaseDto.courseId);
    } catch (error) {
      throw new NotFoundException(`Course with ID ${createCompanyPurchaseDto.courseId} not found`);
    }

    // Generate unique request ID
    const requestId = `COMP-${randomUUID().substring(0, 8)}`;

    const companyPurchase = new this.companyPurchaseModel({
      companyName: createCompanyPurchaseDto.companyName,
      rfc: createCompanyPurchaseDto.rfc,
      contactName: createCompanyPurchaseDto.contactName,
      contactEmail: createCompanyPurchaseDto.contactEmail,
      contactPhone: createCompanyPurchaseDto.contactPhone,
      course: createCompanyPurchaseDto.courseId,
      courseTitle: createCompanyPurchaseDto.courseTitle,
      selectedDate: new Date(createCompanyPurchaseDto.selectedDate),
      quantity: createCompanyPurchaseDto.quantity,
      additionalInfo: createCompanyPurchaseDto.additionalInfo,
      status: CompanyPurchaseStatus.PENDING,
      requestId: requestId,
    });

    const savedPurchase = await companyPurchase.save();

    // Send confirmation email to the contact
    await this.sendConfirmationEmailToContact(savedPurchase);
    
    // Send notification email to admins
    await this.notifyAdminsOfNewRequest(savedPurchase);

    const webhookUrl = process.env.ALEK_WEBHOOK_URL;
    if (webhookUrl) {
      const payload = {
        id: savedPurchase._id,
        companyName: savedPurchase.companyName,
        rfc: savedPurchase.rfc,
        contactName: savedPurchase.contactName,
        contactEmail: savedPurchase.contactEmail,
        contactPhone: savedPurchase.contactPhone,
        course: savedPurchase.course,
        courseTitle: savedPurchase.courseTitle,
        selectedDate: savedPurchase.selectedDate,
        quantity: savedPurchase.quantity,
        additionalInfo: savedPurchase.additionalInfo,
        status: savedPurchase.status,
        requestId: savedPurchase.requestId,
        //createdAt: savedPurchase.createdAt,
       // updatedAt: savedPurchase.updatedAt,
      };

      console.log('Sending payload to webhook:', JSON.stringify(payload, null, 2));

      try {
        await axios.post(webhookUrl, payload);
        console.log('Webhook request sent successfully');
      } catch (error) {
        console.error('Error sending webhook request:', error.message);
      }
    }

    return savedPurchase;
  }

  async findAll(): Promise<CompanyPurchase[]> {
    return this.companyPurchaseModel.find()
      .populate('course')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByStatus(status: CompanyPurchaseStatus): Promise<CompanyPurchase[]> {
    return this.companyPurchaseModel.find({ status })
      .populate('course')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCompany(companyName: string): Promise<CompanyPurchase[]> {
    return this.companyPurchaseModel.find({ 
      companyName: { $regex: new RegExp(companyName, 'i') } 
    })
      .populate('course')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findById(id)
      .populate('course')
      .exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    return companyPurchase;
  }

  async findByRequestId(requestId: string): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findOne({ requestId })
      .populate('course')
      .exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with request ID ${requestId} not found`);
    }

    return companyPurchase;
  }

  async update(id: string, updateCompanyPurchaseDto: UpdateCompanyPurchaseDto): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findByIdAndUpdate(
      id,
      updateCompanyPurchaseDto,
      { new: true }
    ).exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    return companyPurchase;
  }

  async updateStatus(id: string, status: CompanyPurchaseStatus, notes?: string): Promise<CompanyPurchase> {
    const updates: any = { status };
    
    if (notes) {
      updates.adminNotes = notes;
    }
    
    // If marking as paid, add payment date
    if (status === CompanyPurchaseStatus.PAID) {
      updates.paymentDate = new Date();
    }

    const companyPurchase = await this.companyPurchaseModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    // If status is changing to "contacted", send email to the company
    if (status === CompanyPurchaseStatus.CONTACTED) {
      await this.sendContactedEmailToCompany(companyPurchase);
    }
    
    // If status is changing to "paid", send confirmation to the company
    if (status === CompanyPurchaseStatus.PAID) {
      await this.sendPaymentConfirmationToCompany(companyPurchase);
    }

    return companyPurchase;
  }

  async recordPayment(
    id: string, 
    paymentMethod: string, 
    paymentReference: string, 
    paymentAmount: number
  ): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findByIdAndUpdate(
      id,
      {
        status: CompanyPurchaseStatus.PAID,
        paymentMethod,
        paymentReference,
        paymentAmount,
        paymentDate: new Date()
      },
      { new: true }
    ).exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    await this.sendPaymentConfirmationToCompany(companyPurchase);

    return companyPurchase;
  }

  async addEnrollmentId(id: string, enrollmentId: string): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findById(id).exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    // Add the enrollment ID if not already in the list
    if (!companyPurchase.enrollmentIds.includes(enrollmentId)) {
      companyPurchase.enrollmentIds.push(enrollmentId);
    }

    // If all enrollments are added (enrollment count matches quantity), mark as completed
    if (companyPurchase.enrollmentIds.length >= companyPurchase.quantity) {
      companyPurchase.status = CompanyPurchaseStatus.COMPLETED;
    }

    return companyPurchase.save();
  }

  async cancel(id: string, reason: string): Promise<CompanyPurchase> {
    const companyPurchase = await this.companyPurchaseModel.findById(id).exec();

    if (!companyPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }

    companyPurchase.status = CompanyPurchaseStatus.CANCELED;
    companyPurchase.adminNotes = reason;

    await companyPurchase.save();

    // Send cancellation email to the company
    await this.sendCancellationEmailToCompany(companyPurchase, reason);

    return companyPurchase;
  }

  
private async sendConfirmationEmailToContact(purchase: CompanyPurchase): Promise<void> {
  try {
    console.log(`Sending confirmation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
    
    await this.emailService.sendCompanyPurchaseConfirmationEmail(
      purchase.contactEmail,
      {
        requestId: purchase.requestId,
        contactName: purchase.contactName,
        companyName: purchase.companyName,
        courseTitle: purchase.courseTitle,
        selectedDate: purchase.selectedDate,
        quantity: purchase.quantity
      }
    );
  } catch (error) {
    console.error('Error sending confirmation email to contact:', error);
  }
}


private async notifyAdminsOfNewRequest(purchase: CompanyPurchase): Promise<void> {
  try {
    console.log(`Notifying admins about new company purchase request ${purchase.requestId}`);
    
    await this.emailService.sendCompanyPurchaseAdminNotificationEmail(
      {
        requestId: purchase.requestId,
        companyName: purchase.companyName,
        rfc: purchase.rfc,
        contactName: purchase.contactName,
        contactEmail: purchase.contactEmail,
        contactPhone: purchase.contactPhone,
        courseTitle: purchase.courseTitle,
        selectedDate: purchase.selectedDate,
        quantity: purchase.quantity,
        additionalInfo: purchase.additionalInfo
      }
    );
  } catch (error) {
    console.error('Error notifying admins of new request:', error);
  }
}
private async sendContactedEmailToCompany(purchase: CompanyPurchase): Promise<void> {
  try {
    console.log(`Sending contacted email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
    
    await this.emailService.sendCompanyContactedEmail(
      purchase.contactEmail,
      {
        requestId: purchase.requestId,
        contactName: purchase.contactName,
        companyName: purchase.companyName,
        courseTitle: purchase.courseTitle
      }
    );
  } catch (error) {
    console.error('Error sending contacted email to company:', error);
  }
}

private async sendPaymentConfirmationToCompany(purchase: CompanyPurchase): Promise<void> {
  try {
    console.log(`Sending payment confirmation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
    
    await this.emailService.sendCompanyPaymentConfirmationEmail(
      purchase.contactEmail,
      {
        requestId: purchase.requestId,
        contactName: purchase.contactName,
        companyName: purchase.companyName,
        courseTitle: purchase.courseTitle,
        selectedDate: purchase.selectedDate,
        quantity: purchase.quantity,
        paymentMethod: purchase.paymentMethod,
        paymentReference: purchase.paymentReference,
        paymentAmount: purchase.paymentAmount
      }
    );
  } catch (error) {
    console.error('Error sending payment confirmation to company:', error);
  }
}

private async sendCancellationEmailToCompany(purchase: CompanyPurchase, reason: string): Promise<void> {
  try {
    console.log(`Sending cancellation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
    
    await this.emailService.sendCompanyCancellationEmail(
      purchase.contactEmail,
      {
        requestId: purchase.requestId,
        contactName: purchase.contactName,
        companyName: purchase.companyName,
        courseTitle: purchase.courseTitle,
        reason: reason
      }
    );
  } catch (error) {
    console.error('Error sending cancellation email to company:', error);
  }
}
}