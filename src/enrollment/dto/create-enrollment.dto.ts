// src/enrollments/dto/create-enrollment.dto.ts
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { EnrollmentStatus } from '../schemas/enrollment.schema';

export class CreateEnrollmentDto {
    @IsString()
    @IsOptional()
    user?: string;

    @IsString()
    courseDate: string;

    @IsEnum(EnrollmentStatus)
    @IsOptional()
    status?: EnrollmentStatus = EnrollmentStatus.PENDING;

    @IsString()
    @IsOptional()
    payment?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
