// src/company-purchase/dto/update-status.dto.ts
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { CompanyPurchaseStatus } from '../schemas/company-purchase.schema';

export class UpdateStatusDto {
  @IsEnum(CompanyPurchaseStatus)
  status: CompanyPurchaseStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}