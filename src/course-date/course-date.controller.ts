// src/course-dates/course-dates.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  // BadRequestException,
  // NotFoundException,
  // ForbiddenException
} from '@nestjs/common';
import { CourseDatesService } from './course-date.service';
import { CreateCourseDateDto } from './dto/create-course-date.dto';
import { UpdateCourseDateDto } from './dto/update-course-date.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseDateStatus } from './schemas/course-date.schema';

@Controller('course-dates')
export class CourseDatesController {
  constructor(private readonly courseDatesService: CourseDatesService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCourseDateDto: CreateCourseDateDto) {
    return this.courseDatesService.create(createCourseDateDto);
  }

  @Get()
  findAll(@Query('status') status?: CourseDateStatus, @Query('featured') featured?: boolean) {
    return this.courseDatesService.findAll(status, featured);
  }

  @Get('upcoming')
  findUpcoming(@Query('limit') limit?: number) {
    return this.courseDatesService.findUpcoming(limit);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.courseDatesService.findByCourse(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseDatesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCourseDateDto: UpdateCourseDateDto) {
    return this.courseDatesService.update(id, updateCourseDateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.courseDatesService.remove(id);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirmCourseDate(@Param('id') id: string) {
    return this.courseDatesService.updateStatus(id, CourseDateStatus.CONFIRMED);
  }

  @Post(':id/postpone')
  @UseGuards(JwtAuthGuard)
  postponeCourseDate(@Param('id') id: string, @Body() data: { newDate?: Date, reason?: string }) {
    return this.courseDatesService.postponeCourse(id, data.newDate, data.reason);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelCourseDate(@Param('id') id: string, @Body() data: { reason?: string }) {
    return this.courseDatesService.cancelCourse(id, data.reason);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  completeCourseDate(@Param('id') id: string) {
    return this.courseDatesService.updateStatus(id, CourseDateStatus.COMPLETED);
  }

  @Get('check-postponement')
  @UseGuards(JwtAuthGuard)
  checkPostponementStatus() {
    return this.courseDatesService.checkAllCoursesForPostponement();
  }
}