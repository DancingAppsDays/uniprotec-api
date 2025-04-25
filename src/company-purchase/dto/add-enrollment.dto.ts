// src/company-purchase/dto/add-enrollment.dto.ts
import { IsString } from 'class-validator';

export class AddEnrollmentDto {
  @IsString()
  enrollmentId: string;
}