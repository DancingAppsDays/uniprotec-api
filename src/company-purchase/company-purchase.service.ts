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
      // Implementation will depend on your email service
      // For now, we'll log the info that would be sent
      console.log(`Sending confirmation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
      
      // Implement with EmailService when ready
      /*
      await this.emailService.sendEmail({
        to: purchase.contactEmail,
        subject: `Solicitud de compra recibida - ${purchase.requestId}`,
        html: `
          <h1>Hemos recibido tu solicitud de compra</h1>
          <p>Estimado(a) ${purchase.contactName},</p>
          <p>Gracias por tu interés en adquirir el curso "${purchase.courseTitle}" para ${purchase.companyName}.</p>
          <p>Tu solicitud ha sido recibida y uno de nuestros representantes se pondrá en contacto contigo en las próximas 24 horas hábiles para coordinar los detalles del pago y la facturación.</p>
          <p>Detalles de la solicitud:</p>
          <ul>
            <li><strong>Número de solicitud:</strong> ${purchase.requestId}</li>
            <li><strong>Curso:</strong> ${purchase.courseTitle}</li>
            <li><strong>Fecha seleccionada:</strong> ${new Date(purchase.selectedDate).toLocaleDateString('es-MX')}</li>
            <li><strong>Cantidad:</strong> ${purchase.quantity} participantes</li>
          </ul>
          <p>Si tienes alguna pregunta, puedes responder a este correo o llamarnos al (55) 1234-5678.</p>
        `
      });
      */
    } catch (error) {
      console.error('Error sending confirmation email to contact:', error);
    }
  }

  private async notifyAdminsOfNewRequest(purchase: CompanyPurchase): Promise<void> {
    try {
      // Implementation will depend on your email service
      // For now, we'll log the info that would be sent
      console.log(`Notifying admins about new company purchase request ${purchase.requestId}`);
      
      // Implement with EmailService when ready
      /*
      await this.emailService.sendEmail({
        to: 'ventas@academia-uniprotec.com', // Replace with your admin email
        subject: `Nueva solicitud de compra empresarial - ${purchase.requestId}`,
        html: `
          <h1>Nueva solicitud de compra empresarial</h1>
          <p>Se ha recibido una nueva solicitud de compra empresarial:</p>
          <ul>
            <li><strong>Empresa:</strong> ${purchase.companyName}</li>
            <li><strong>RFC:</strong> ${purchase.rfc}</li>
            <li><strong>Contacto:</strong> ${purchase.contactName}</li>
            <li><strong>Email:</strong> ${purchase.contactEmail}</li>
            <li><strong>Teléfono:</strong> ${purchase.contactPhone}</li>
            <li><strong>Curso:</strong> ${purchase.courseTitle}</li>
            <li><strong>Fecha seleccionada:</strong> ${new Date(purchase.selectedDate).toLocaleDateString('es-MX')}</li>
            <li><strong>Cantidad:</strong> ${purchase.quantity} participantes</li>
            <li><strong>Información adicional:</strong> ${purchase.additionalInfo || 'N/A'}</li>
          </ul>
          <p>Por favor, contacte al cliente lo antes posible para coordinar los detalles del pago y la facturación.</p>
        `
      });
      */
    } catch (error) {
      console.error('Error notifying admins of new request:', error);
    }
  }

  private async sendContactedEmailToCompany(purchase: CompanyPurchase): Promise<void> {
    try {
      console.log(`Sending contacted email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
      
      // Implement with EmailService when ready
    } catch (error) {
      console.error('Error sending contacted email to company:', error);
    }
  }

  private async sendPaymentConfirmationToCompany(purchase: CompanyPurchase): Promise<void> {
    try {
      console.log(`Sending payment confirmation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
      
      // Implement with EmailService when ready
    } catch (error) {
      console.error('Error sending payment confirmation to company:', error);
    }
  }

  private async sendCancellationEmailToCompany(purchase: CompanyPurchase, reason: string): Promise<void> {
    try {
      console.log(`Sending cancellation email to ${purchase.contactEmail} for company purchase ${purchase.requestId}`);
      
      // Implement with EmailService when ready
    } catch (error) {
      console.error('Error sending cancellation email to company:', error);
    }
  }
}