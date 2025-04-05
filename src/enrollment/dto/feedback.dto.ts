
// src/enrollments/dto/feedback.dto.ts
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class FeedbackDto {
    @IsString()
    feedback: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;
}