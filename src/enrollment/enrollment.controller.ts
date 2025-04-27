// src/enrollments/enrollments.controller.ts
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
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { EnrollmentsService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrollmentStatus } from './schemas/enrollment.schema';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createEnrollmentDto: CreateEnrollmentDto, @Request() req) {
    // If user is enrolling themselves, use the authenticated user's ID
    if (!createEnrollmentDto.user) {
      createEnrollmentDto.user = req.user.userId;
    }
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req, @Query('status') status?: EnrollmentStatus) {
    // For regular users, only show their own enrollments
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return this.enrollmentsService.findByUser(req.user.userId, status);
    }
    // For admins, show all enrollments
    return this.enrollmentsService.findAll(status);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findByUser(
    @Request() req,
    @Param('userId') userId: string,
    @Query('status') status?: EnrollmentStatus,

  ) {
    // console.log("Headers:", req.headers);
    // console.log("Method and URL:", req.method, req.url);
    // console.log("req paramaters:", req.params);
    //console.log("req.user", req.user);
   // console.log("req.user.userId", req.user.userId);


    // Users can only view their own enrollments unless they're an admin
    if (userId !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to view these enrollments');
      console.log("you are not supposed to be able to see other users enrollments, so this is a bad request");
    }

    //no longer needed, since we are using the userId from the request
    // if(req.params.userId){
    //   console.log("req.param.userid", req.params.userId);
    //   userId = req.params.userId;

    // }

    //console.log(req.user.userId, userId, status);
    return this.enrollmentsService.findByUser(userId, status);
  }

  @Get('course-date/:courseDateId')
  @UseGuards(JwtAuthGuard)
  findByCourseDate(
    @Request() req,
    @Param('courseDateId') courseDateId: string,
    @Query('status') status?: EnrollmentStatus,

  ) {
    // Only admins can view all enrollments for a course date
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to view these enrollments');
    }
    return this.enrollmentsService.findByCourseDate(courseDateId, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const enrollment = await this.enrollmentsService.findOne(id);

    // Users can only view their own enrollments unless they're an admin
    if (enrollment.user.toString() !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to view this enrollment');
    }

    return enrollment;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Request() req
  ) {
    const enrollment = await this.enrollmentsService.findOne(id);

    // Only admins can update enrollments
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to update this enrollment');
    }

    return this.enrollmentsService.update(id, updateEnrollmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    const enrollment = await this.enrollmentsService.findOne(id);

    // Users can only delete their own enrollments unless they're an admin
    if (enrollment.user.toString() !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to delete this enrollment');
    }

    return this.enrollmentsService.remove(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelEnrollment(
    @Param('id') id: string,
    @Body() data: { reason?: string },
    @Request() req
  ) {
    const enrollment = await this.enrollmentsService.findOne(id);

    // Users can only cancel their own enrollments unless they're an admin
    if (enrollment.user.toString() !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to cancel this enrollment');
    }

    return this.enrollmentsService.cancel(id, data.reason);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmEnrollment(@Param('id') id: string, @Request() req) {
    // Only admins can manually confirm enrollments
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to confirm enrollments');
    }

    return this.enrollmentsService.updateStatus(id, EnrollmentStatus.CONFIRMED);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeEnrollment(@Param('id') id: string, @Request() req) {
    // Only admins can mark enrollments as completed
    if (!req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You are not authorized to complete enrollments');
    }

    return this.enrollmentsService.updateStatus(id, EnrollmentStatus.COMPLETED);
  }

  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard)
  async provideFeedback(
    @Param('id') id: string,
    @Body() data: { feedback: string, rating: number },
    @Request() req
  ) {
    const enrollment = await this.enrollmentsService.findOne(id);

    // Users can only provide feedback for their own enrollments
    if (enrollment.user.toString() !== req.user.userId) {
      throw new ForbiddenException('You are not authorized to provide feedback for this enrollment');
    }

    return this.enrollmentsService.provideFeedback(id, data.feedback, data.rating);
  }

  //unused endpoint?
  @Get('check/:courseDate/:userId')
async checkEnrollmentStatus(
  @Param('courseDate') courseDateId: string,
  @Param('userId') userId: string
) {
  try {
    const isEnrolled = await this.enrollmentsService.isUserEnrolled(courseDateId, userId);
    return { enrolled: isEnrolled };
  } catch (error) {
    throw new BadRequestException('Failed to check enrollment status');
  }
}
}