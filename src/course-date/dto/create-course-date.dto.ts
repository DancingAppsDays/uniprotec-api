// src/course-dates/dto/create-course-date.dto.ts
import { IsString, IsDate, IsNumber, IsEnum, IsOptional, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseDateStatus } from '../schemas/course-date.schema';

class InstructorDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specialties?: string[];
}

export class CreateCourseDateDto {
    @IsString()
    course: string;

    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @IsNumber()
    @Min(1)
    @IsOptional()
    capacity: number = 15;

    @IsNumber()
    @Min(0)
    @IsOptional()
    enrolledCount: number = 0;

    @ValidateNested()
    @Type(() => InstructorDto)
    instructor: InstructorDto;

    @IsString()
    @IsOptional()
    location?: string = '';

    @IsString()
    @IsOptional()
    meetingUrl?: string;

     @IsString()
  @IsOptional()
  whatsappGroup?: string;

    @IsEnum(CourseDateStatus)
    @IsOptional()
    status?: CourseDateStatus = CourseDateStatus.SCHEDULED;

    @IsNumber()
    @Min(1)
    @IsOptional()
    minimumRequired?: number = 6;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    enrolledUsers?: string[] = [];

    @IsString()
    @IsOptional()
    zoomMeetingId?: string;

    @IsString()
    @IsOptional()
    zoomPassword?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}