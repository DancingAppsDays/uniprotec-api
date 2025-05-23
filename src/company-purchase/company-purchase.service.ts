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
import { CourseDatesService } from 'src/course-date/course-date.service';
import { CourseDate } from 'src/course-date/schemas/course-date.schema';


@Injectable()
export class CompanyPurchaseService {
  constructor(
    @InjectModel(CompanyPurchase.name) private companyPurchaseModel: Model<CompanyPurchaseDocument>,
    private coursesService: CoursesService,
    private emailService: EmailService,
     private courseDateService: CourseDatesService,
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


  /*
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

    async update(id: string, updateCompanyPurchaseDto: UpdateCompanyPurchaseDto): Promise<CompanyPurchase> {
  // First find the company purchase to check if we're updating quantity
  if (updateCompanyPurchaseDto.quantity !== undefined) {
    const currentPurchase = await this.companyPurchaseModel.findById(id).exec();
    
    if (!currentPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }
    
    // Check if the new quantity is less than current enrollment count
    if (updateCompanyPurchaseDto.quantity < currentPurchase.enrollmentIds.length) {
      throw new BadRequestException(
        `Cannot reduce quantity to ${updateCompanyPurchaseDto.quantity} because there are already ${currentPurchase.enrollmentIds.length} enrollments.`
      );
    }
    
    // Check if status should be changed to completed
    if (updateCompanyPurchaseDto.quantity === currentPurchase.enrollmentIds.length && 
        currentPurchase.status === CompanyPurchaseStatus.PAID) {
      updateCompanyPurchaseDto.status = CompanyPurchaseStatus.COMPLETED;
    }
  }
  
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
  
  const currentPurchase = await this.companyPurchaseModel.findById(id).exec();
  
  if (!currentPurchase) {
    throw new NotFoundException(`Company purchase with ID ${id} not found`);
  }
  
  // If marking as paid and it wasn't already paid, reserve the seats in the course date
  if (status === CompanyPurchaseStatus.PAID && 
      currentPurchase.status !== CompanyPurchaseStatus.PAID && 
      currentPurchase.status !== CompanyPurchaseStatus.COMPLETED) {
      
    updates.paymentDate = new Date();
    
    // Find the course date that matches the selectedDate
    const courseDates = await this.courseDateService.findByCourse(currentPurchase.course.toString());
    
    let targetCourseDate : CourseDate | null = null;
    for (const courseDate of courseDates) {
      const courseDateStart = new Date(courseDate.startDate);
      const purchaseDate = new Date(currentPurchase.selectedDate);
      
      // Compare dates without time component
      if (courseDateStart.toDateString() === purchaseDate.toDateString()) {
        targetCourseDate = courseDate;
        break;
      }
    }
    
    if (!targetCourseDate) {
      throw new NotFoundException(`Could not find course date matching selected date ${currentPurchase.selectedDate}`);
    }
    
    // Update the course date to reserve seats by increasing enrolledCount
    await this.courseDateService.reserveSeats(targetCourseDate._id, currentPurchase.quantity);
    
    // Store the course date ID in the purchase metadata for reference
    updates.metadata = {
      ...currentPurchase.metadata,
      courseDateId: targetCourseDate._id,
      reservedSeats: currentPurchase.quantity
    };
  }
  
  const companyPurchase = await this.companyPurchaseModel.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  ).exec();

  if (!companyPurchase) {
    throw new NotFoundException(`Company purchase with ID ${id} not found`);
  }

  // Send appropriate notifications based on status change
  if (status === CompanyPurchaseStatus.CONTACTED) {
    await this.sendContactedEmailToCompany(companyPurchase);
  }
  
  if (status === CompanyPurchaseStatus.PAID) {
    await this.sendPaymentConfirmationToCompany(companyPurchase);
  }

  return companyPurchase;
  }

*/






  
async updateStatus(id: string, status: CompanyPurchaseStatus, notes?: string): Promise<CompanyPurchase> {
  const updates: any = { status };
  
  if (notes) {
    updates.adminNotes = notes;
  }
  
  const currentPurchase = await this.companyPurchaseModel.findById(id).exec();
  
  if (!currentPurchase) {
    throw new NotFoundException(`Company purchase with ID ${id} not found`);
  }
  
  // If marking as paid and it wasn't already paid, reserve the seats in the course date
  if (status === CompanyPurchaseStatus.PAID && 
      currentPurchase.status !== CompanyPurchaseStatus.PAID && 
      currentPurchase.status !== CompanyPurchaseStatus.COMPLETED) {
      
    updates.paymentDate = new Date();
    
    // Find the course date that matches the selectedDate
    const courseDates = await this.courseDateService.findByCourse(currentPurchase.course.toString());
    
    let targetCourseDate : CourseDate | null = null;
    for (const courseDate of courseDates) {
      const courseDateStart = new Date(courseDate.startDate);
      const purchaseDate = new Date(currentPurchase.selectedDate);
      
      // Compare dates without time component
      if (courseDateStart.toDateString() === purchaseDate.toDateString()) {
        targetCourseDate = courseDate;
        break;
      }
    }
    
    if (!targetCourseDate) {
      throw new NotFoundException(`Could not find course date matching selected date ${currentPurchase.selectedDate}`);
    }
    
    // Check if there's enough capacity before reserving
    const availableSeats = targetCourseDate.capacity - targetCourseDate.enrolledCount;
    if (currentPurchase.quantity > availableSeats) {
      throw new BadRequestException(
        `Cannot reserve ${currentPurchase.quantity} seats. Only ${availableSeats} seats available.`
      );
    }
    
    // Update the course date to reserve seats by increasing enrolledCount
    await this.courseDateService.reserveSeats(targetCourseDate._id, currentPurchase.quantity);
    
    // Store the course date ID in the purchase metadata for reference
    updates.metadata = {
      ...currentPurchase.metadata,
      courseDateId: targetCourseDate._id,
      reservedSeats: currentPurchase.quantity,
      seatsReservedAt: new Date()
    };
  }
  
  const companyPurchase = await this.companyPurchaseModel.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  ).exec();

  if (!companyPurchase) {
    throw new NotFoundException(`Company purchase with ID ${id} not found`);
  }

  // Send appropriate notifications based on status change
  if (status === CompanyPurchaseStatus.CONTACTED) {
    await this.sendContactedEmailToCompany(companyPurchase);
  }
  
  if (status === CompanyPurchaseStatus.PAID) {
    await this.sendPaymentConfirmationToCompany(companyPurchase);
  }

  return companyPurchase;
}

// Also add this method to handle quantity updates with seat validation:
async update(id: string, updateCompanyPurchaseDto: UpdateCompanyPurchaseDto): Promise<CompanyPurchase> {
  // First find the company purchase to check if we're updating quantity
  if (updateCompanyPurchaseDto.quantity !== undefined) {
    const currentPurchase = await this.companyPurchaseModel.findById(id).exec();
    
    if (!currentPurchase) {
      throw new NotFoundException(`Company purchase with ID ${id} not found`);
    }
    
    // Check if the new quantity is less than current enrollment count
    if (updateCompanyPurchaseDto.quantity < currentPurchase.enrollmentIds.length) {
      throw new BadRequestException(
        `Cannot reduce quantity to ${updateCompanyPurchaseDto.quantity} because there are already ${currentPurchase.enrollmentIds.length} enrollments.`
      );
    }
    
    // If the purchase is already paid, check if we need to adjust reserved seats
    if (currentPurchase.status === CompanyPurchaseStatus.PAID && 
        currentPurchase.metadata?.courseDateId) {
      
      const quantityDifference = updateCompanyPurchaseDto.quantity - currentPurchase.quantity;
      
      if (quantityDifference > 0) {
        // Need to reserve more seats
        try {
          await this.courseDateService.reserveSeats(
            currentPurchase.metadata.courseDateId, 
            quantityDifference
          );
        } catch (error) {
          throw new BadRequestException(
            `Cannot increase quantity: ${error.message}`
          );
        }
      } else if (quantityDifference < 0) {
        //TODO: Handle seat release
        // Need to release some seats
        // This would require a new method in CourseDateService to release seats
        // For now, we'll just update the metadata
      updateCompanyPurchaseDto.metadata = {
          ...(currentPurchase.metadata || {}), // 
          reservedSeats: updateCompanyPurchaseDto.quantity,
          seatsAdjustedAt: new Date()
        };
      }
    }
    
    // Check if status should be changed to completed
    if (updateCompanyPurchaseDto.quantity === currentPurchase.enrollmentIds.length && 
        currentPurchase.status === CompanyPurchaseStatus.PAID) {
      updateCompanyPurchaseDto.status = CompanyPurchaseStatus.COMPLETED;
    }
  }
  
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