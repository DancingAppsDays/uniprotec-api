
// src/enrollments/dto/update-enrollment.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrollmentDto } from './create-enrollment.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateEnrollmentDto extends PartialType(CreateEnrollmentDto) {
    @IsString()
    @IsOptional()
    certificateUrl?: string;

    @IsString()
    @IsOptional()
    feedback?: string;

    @IsOptional()
    feedbackRating?: number;

    @IsOptional()
    emailSent?: boolean;

    @IsOptional()
    emailSentDate?: Date;
}
