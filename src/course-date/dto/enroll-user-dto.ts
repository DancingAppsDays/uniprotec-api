import { IsBoolean, IsOptional, IsString } from "class-validator";

// src/course-dates/dto/enroll-user.dto.ts
export class EnrollUserDto {
    @IsString()
    userId: string;

    @IsBoolean()
    @IsOptional()
    sendConfirmation?: boolean = true;
}