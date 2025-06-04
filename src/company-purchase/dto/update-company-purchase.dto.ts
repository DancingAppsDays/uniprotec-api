
// src/company-purchase/dto/update-company-purchase.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyPurchaseDto } from './create-company-purchase.dto';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CompanyPurchaseStatus } from '../schemas/company-purchase.schema';
import { Type } from 'class-transformer';

export class UpdateCompanyPurchaseDto extends PartialType(CreateCompanyPurchaseDto) {
  @IsEnum(CompanyPurchaseStatus)
  @IsOptional()
  status?: CompanyPurchaseStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsNumber()
  @IsOptional()
  paymentAmount?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  paymentDate?: Date;

   
  @IsOptional()
   metadata?: Record<string, any>; 
}
