// src/course-dates/dto/postpone-course-date.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsDate } from 'class-validator';

export class PostponeCourseDateDto {
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    newDate?: Date;

    @IsString()
    @IsOptional()
    reason?: string;
}