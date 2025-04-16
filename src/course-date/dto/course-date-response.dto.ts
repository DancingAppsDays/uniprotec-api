import { CourseDateStatus } from "../schemas/course-date.schema";

// src/course-dates/dto/course-date-response.dto.ts
export class CourseDateResponseDto {
    id: string;
    course: any;
    startDate: Date;
    endDate: Date;
    capacity: number;
    enrolledCount: number;
    instructor: {
        name: string;
        photoUrl?: string;
        bio?: string;
        specialties?: string[];
    };
    location: string;
    meetingUrl?: string;
    status: CourseDateStatus;
    minimumRequired: number;
    enrolledUsers?: any[];
    availableSeats?: number;
    isNearlyFull?: boolean;
    isConfirmed?: boolean;
    isAtRiskOfPostponement?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
