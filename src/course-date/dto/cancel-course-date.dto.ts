import { IsOptional, IsString } from "class-validator";

// src/course-dates/dto/cancel-course-date.dto.ts
export class CancelCourseDateDto {
    @IsString()
    @IsOptional()
    reason?: string;
}