// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CourseDatesService } from '../../course-date/course-date.service';
import { EnrollmentsService } from '../../enrollment/enrollment.service';
import { CoursesService } from '../../courses/courses.service';
import { PostponeCourseDateDto } from '../../course-date/dto/pospone-course-date.dto'
import { CancelCourseDateDto } from '../../course-date/dto/cancel-course-date.dto';
import { CourseDateStatus } from '../../course-date/schemas/course-date.schema';
import { FilterCourseDatesDto } from '../../course-date/dto/filter-course-dates-dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseDatesService: CourseDatesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) { }

  // Ensure only admin users can access these endpoints
  private checkAdminAccess(req: any) {
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to access this resource');
    }
  }

  @Get('dashboard/stats')
  async getDashboardStats(@Request() req) {
    this.checkAdminAccess(req);

    // Get current date
    const now = new Date();

    // Get upcoming course dates
    const upcomingCourseDates = await this.courseDatesService.findAll({
      status: CourseDateStatus.SCHEDULED,
      startDateFrom: now,
    });

    // Get all enrollments
    const allEnrollments = await this.enrollmentsService.findAll();

    // Get all courses
    const allCourses = await this.coursesService.findAll();

    // Calculate at-risk courses (those with insufficient enrollment close to start date)
    const atRiskCourses = upcomingCourseDates.filter(date => {
      // Calculate days until start
      const daysUntil = Math.ceil((new Date(date.startDate).getTime() - now.getTime()) / (86400000));

      // Get policy for this course
      const policy = date.course.postponementPolicy || { minimumRequired: 6, deadlineDays: 2 };

      // Check if this course is at risk (close to deadline and insufficient enrollment)
      return daysUntil <= policy.deadlineDays && date.enrolledCount < policy.minimumRequired;
    });

    return {
      totalCourses: allCourses.length,
      upcomingCourseDates: upcomingCourseDates.length,
      atRiskCourses: atRiskCourses.length,
      totalEnrollments: allEnrollments.length,
      recentCourses: await this.coursesService.findAll({ limit: 5, sort: 'createdAt', order: 'desc' }),
      nextCoursesToStart: upcomingCourseDates.slice(0, 5),
      coursesAtRisk: atRiskCourses.slice(0, 5),
    };
  }

  @Get('course-dates')
  async getAllCourseDates(@Query() filterDto: FilterCourseDatesDto, @Request() req) {
    this.checkAdminAccess(req);
    return this.courseDatesService.findAll(filterDto);
  }

  @Get('course-dates/:id')
  async getCourseDate(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.courseDatesService.findOne(id);
  }

  @Post('course-dates/:id/confirm')
  async confirmCourseDate(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.courseDatesService.updateStatus(id, CourseDateStatus.CONFIRMED);
  }

  @Post('course-dates/:id/postpone')
  async postponeCourseDate(
    @Param('id') id: string,
    @Body() postponeDto: PostponeCourseDateDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.courseDatesService.postponeCourse(id, postponeDto.newDate, postponeDto.reason);
  }

  @Post('course-dates/:id/cancel')
  async cancelCourseDate(
    @Param('id') id: string,
    @Body() cancelDto: CancelCourseDateDto,
    @Request() req
  ) {
    this.checkAdminAccess(req);
    return this.courseDatesService.cancelCourse(id, cancelDto.reason);
  }

  @Post('course-dates/:id/complete')
  async completeCourseDate(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.courseDatesService.updateStatus(id, CourseDateStatus.COMPLETED);
  }

  @Get('course-dates/:id/enrollments')
  async getCourseEnrollments(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.enrollmentsService.findByCourseDate(id);
  }

  @Get('check-postponement')
  async checkPostponementStatus(@Request() req) {
    this.checkAdminAccess(req);
    return this.courseDatesService.checkAllCoursesForPostponement();
  }

  @Get('enrollments')
  async getAllEnrollments(@Request() req) {
    this.checkAdminAccess(req);
    return this.enrollmentsService.findAll();
  }

  @Get('enrollments/:id')
  async getEnrollment(@Param('id') id: string, @Request() req) {
    this.checkAdminAccess(req);
    return this.enrollmentsService.findOne(id);
  }
}