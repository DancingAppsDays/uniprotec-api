import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

// src/courses/dto/filter-courses.dto.ts
export class FilterCoursesDto {

    @IsOptional()
    @IsEnum(['date', 'title', 'price', 'createdAt']) // Add "createdAt" here
    sort?: 'date' | 'title' | 'price' | 'createdAt';

    @IsString()
    @IsOptional()
    category?: string;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsString()
    @IsOptional()
    search?: string;

    // @IsString()
    // @IsOptional()
    // sort?: 'price' | 'date' | 'title' = 'date';

    @IsString()
    @IsOptional()
    order?: 'asc' | 'desc' = 'asc';

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
    withDates?: boolean = false;
}