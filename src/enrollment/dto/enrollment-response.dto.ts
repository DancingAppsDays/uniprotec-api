
// src/enrollments/dto/enrollment-response.dto.ts
import { EnrollmentStatus } from '../schemas/enrollment.schema';

export class EnrollmentResponseDto {
    id: string;
    user: any;
    courseDate: any;
    status: EnrollmentStatus;
    payment?: any;
    certificateUrl?: string;
    feedback?: string;
    feedbackRating?: number;
    emailSent: boolean;
    emailSentDate?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
