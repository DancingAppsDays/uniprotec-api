// src/courses/dto/postponement-policy.dto.ts
import { IsNumber, IsBoolean, IsString, IsDate, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PostponementPolicyDto {
    @IsNumber()
    @Min(1)
    @IsOptional()
    minimumRequired?: number = 6;

    @IsNumber()
    @Min(1)
    @IsOptional()
    deadlineDays?: number = 2;

    @IsBoolean()
    @IsOptional()
    enableAutoPostponement?: boolean = false;

    @IsBoolean()
    @IsOptional()
    notifyUsers?: boolean = true;

    @IsString()
    @IsOptional()
    customMessage?: string;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    defaultNextCourseDate?: Date;
}
