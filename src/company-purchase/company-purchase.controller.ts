// src/company-purchase/company-purchase.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { CompanyPurchaseService } from './company-purchase.service';
import { CreateCompanyPurchaseDto } from './dto/create-company-purchase.dto';
import { UpdateCompanyPurchaseDto } from './dto/update-company-purchase.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AddEnrollmentDto } from './dto/add-enrollment.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { CompanyPurchaseStatus } from './schemas/company-purchase.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('company-purchase')
export class CompanyPurchaseController {
  constructor(private readonly companyPurchaseService: CompanyPurchaseService) {}

  // Public endpoint for submitting company purchase requests
  @Post()
  create(@Body() createCompanyPurchaseDto: CreateCompanyPurchaseDto) {
    return this.companyPurchaseService.create(createCompanyPurchaseDto);
  }

  // Check request status by ID for client-side tracking
  @Get('status/:requestId')
  findByRequestId(@Param('requestId') requestId: string) {
    return this.companyPurchaseService.findByRequestId(requestId);
  }

  // Admin-only endpoints below
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req, @Query('status') status?: CompanyPurchaseStatus) {
    this.checkAdminAccess(req);
    
    if (status) {
      return this.companyPurchaseService.findByStatus(status);
    }
    return this.companyPurchaseService.findAll();
  }

  @Get('company')
  @UseGuards(JwtAuthGuard)
  findByCompany(@Request() req, @Query('name') companyName: string) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.findByCompany(companyName);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string, 
    @Body() updateCompanyPurchaseDto: UpdateCompanyPurchaseDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.update(id, updateCompanyPurchaseDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.updateStatus(
      id, 
      updateStatusDto.status, 
      updateStatusDto.notes
    );
  }

  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.recordPayment(
      id,
      recordPaymentDto.paymentMethod,
      recordPaymentDto.paymentReference,
      recordPaymentDto.paymentAmount
    );
  }

  @Post(':id/enrollment')
  @UseGuards(JwtAuthGuard)
  addEnrollment(
    @Param('id') id: string,
    @Body() addEnrollmentDto: AddEnrollmentDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.addEnrollmentId(
      id,
      addEnrollmentDto.enrollmentId
    );
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id') id: string,
    @Body() cancelRequestDto: CancelRequestDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.companyPurchaseService.cancel(id, cancelRequestDto.reason);
  }

  // Helper method to ensure admin access
  private checkAdminAccess(req: any) {
    if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
      throw new ForbiddenException('You need admin access to perform this action');
    }
  }
}