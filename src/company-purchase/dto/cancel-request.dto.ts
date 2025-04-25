// src/company-purchase/dto/cancel-request.dto.ts
import { IsString } from 'class-validator';

export class CancelRequestDto {
  @IsString()
  reason: string;
}