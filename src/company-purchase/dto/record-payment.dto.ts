// src/company-purchase/dto/record-payment.dto.ts
import { IsNumber, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  paymentMethod: string;

  @IsString()
  paymentReference: string;

  @IsNumber()
  @Min(0)
  paymentAmount: number;
}