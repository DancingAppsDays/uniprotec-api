// src/courses/courses.controller.ts
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
  ForbiddenException,
  Request
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilterCourseDatesDto } from '../course-date/dto/filter-course-dates-dto';
import { PostponementPolicyDto } from '../postponement-policy/dto/postponement-policy.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    // Only admin users can create courses
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to create courses');
    }
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterCourseDatesDto) {
    return this.coursesService.findAll(filterDto);
  }

  @Get('featured')
  findFeatured() {
    return this.coursesService.findFeatured();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.coursesService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Get(':id/dates')
  findCourseWithDates(@Param('id') id: string) {
    return this.coursesService.findCourseWithDates(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto, @Request() req) {
    // Only admin users can update courses
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to update courses');
    }
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    // Only admin users can delete courses
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to delete courses');
    }
    return this.coursesService.remove(id);
  }

  @Post(':id/postponement-policy')
  @UseGuards(JwtAuthGuard)
  setPostponementPolicy(
    @Param('id') id: string,
    @Body() policyDto: PostponementPolicyDto,
    @Request() req
  ) {
    // Only admin users can set postponement policies
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to set postponement policies');
    }
    return this.coursesService.setPostponementPolicy(id, policyDto);
  }

  @Get(':id/postponement-policy')
  getPostponementPolicy(@Param('id') id: string) {
    return this.coursesService.getPostponementPolicy(id);
  }

  @Get(':id/available-dates')
  getAvailableDates(@Param('id') id: string) {
    return this.coursesService.getAvailableDates(id);
  }
}