// src/course-dates/dto/update-course-date.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDateDto } from './create-course-date.dto';
import { CourseDateStatus } from '../schemas/course-date.schema';

export class UpdateCourseDateDto extends PartialType(CreateCourseDateDto) { }

