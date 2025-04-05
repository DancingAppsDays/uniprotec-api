// src/course-dates/dto/filter-course-dates.dto.ts
import { IsOptional, IsEnum, IsDate, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseDateStatus } from '../schemas/course-date.schema';

export class FilterCourseDatesDto {
    @IsEnum(CourseDateStatus)
    @IsOptional()
    status?: CourseDateStatus;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startDateFrom?: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startDateTo?: Date;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsNumber()
    @Min(1)
    @IsOptional()
    limit?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    skip?: number;

    @IsBoolean()
    @IsOptional()
    includeEnrolledUsers?: boolean;

    @IsBoolean()
    @IsOptional()
    onlyAvailable?: boolean;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    minEnrollmentPercentage?: number;
}