// src/company-purchase/dto/create-company-purchase.dto.ts
import { IsString, IsNumber, IsOptional, IsDate, Min, IsEmail, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompanyPurchaseDto {
  @IsString()
  companyName: string;

  @IsString()
  @Matches(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/)
  rfc: string;

  @IsString()
  contactName: string;

  @IsString()
  @IsEmail()
  contactEmail: string;

  @IsString()
  @Matches(/^[0-9]{10}$/)
  contactPhone: string;

  @IsString()
  courseId: string;

  @IsString()
  courseTitle: string;

  @IsString()
  selectedDate: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity: number = 1;

  @IsString()
  @IsOptional()
  additionalInfo?: string;
}