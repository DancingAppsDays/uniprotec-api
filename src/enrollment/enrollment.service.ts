// src/enrollments/enrollments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { Enrollment, EnrollmentDocument, EnrollmentStatus } from './schemas/enrollment.schema';
import { CourseDate, CourseDateDocument, CourseDateStatus } from '../course-date/schemas/course-date.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { CourseDatesService } from '../course-date/course-date.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(CourseDate.name) private courseDateModel: Model<CourseDateDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private courseDatesService: CourseDatesService,
    private emailService: EmailService,
  ) { }

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    // Check if user exists
    const user = await this.userModel.findById(createEnrollmentDto.user).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${createEnrollmentDto.user} not found`);
    }

    // Check if course date exists
    const courseDate = await this.courseDateModel.findById(createEnrollmentDto.courseDate)
      .populate('course')
      .exec();
    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${createEnrollmentDto.courseDate} not found`);
    }

    // Check if the course date is full
    if (courseDate.enrolledCount >= courseDate.capacity) {
      throw new BadRequestException('This course date is at full capacity');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentModel.findOne({
      user: createEnrollmentDto.user,
      courseDate: createEnrollmentDto.courseDate,
      status: { $nin: [EnrollmentStatus.CANCELED, EnrollmentStatus.REFUNDED] }
    }).exec();

    if (existingEnrollment) {
      throw new BadRequestException('User is already enrolled in this course date');
    }

    // If payment is provided, check if it exists
    if (createEnrollmentDto.payment) {
      const payment = await this.paymentModel.findById(createEnrollmentDto.payment).exec();
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${createEnrollmentDto.payment} not found`);
      }
    }

    // Create enrollment
    const newEnrollment = new this.enrollmentModel(createEnrollmentDto);
    const enrollment = await newEnrollment.save();

    // Update course date enrolled count and add user to enrolled users
    await this.courseDatesService.addEnrolledUser(
      createEnrollmentDto.courseDate,
      createEnrollmentDto.user
    );

    // Send confirmation email
    if (user.email && courseDate.course) {
      const courseData = {
        title: courseDate.course.title,
        selectedDate: courseDate.startDate,
        zoomLink: courseDate.meetingUrl || '',
        zoomMeetingId: courseDate.zoomMeetingId || '',
        zoomPassword: courseDate.zoomPassword || '',
        instructor: courseDate.instructor.name
      };

      await this.emailService.sendCourseAccessEmail(user.email, courseData);

      // Mark that email was sent
      enrollment.emailSent = true;
      enrollment.emailSentDate = new Date();
      await enrollment.save();
    }

    return enrollment;
  }

  async findAll(status?: EnrollmentStatus): Promise<Enrollment[]> {
    let query = this.enrollmentModel.find()
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment');

    if (status) {
      query = query.where('status').equals(status);
    }

    return query.sort({ createdAt: -1 }).exec();
  }

  async findByUser(userId: string, status?: EnrollmentStatus): Promise<Enrollment[]> {
    let query = this.enrollmentModel.find({ user: userId })
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment');

    if (status) {
      query = query.where('status').equals(status);
    }

    return query.sort({ createdAt: -1 }).exec();
  }

  async findByCourseDate(courseDateId: string, status?: EnrollmentStatus): Promise<Enrollment[]> {
    let query = this.enrollmentModel.find({ courseDate: courseDateId })
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment');

    if (status) {
      query = query.where('status').equals(status);
    }

    return query.sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(id)
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment')
      .exec();

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findByIdAndUpdate(
      id,
      updateEnrollmentDto,
      { new: true }
    )
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment')
      .exec();

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  async remove(id: string): Promise<Enrollment> {
    const enrollment = await this.findOne(id);

    // Remove user from course date enrolled users
    await this.courseDatesService.removeEnrolledUser(
      enrollment.courseDate._id.toString(),
      enrollment.user._id.toString()
    );

    return this.enrollmentModel.findByIdAndDelete(id).exec();
  }

  async updateStatus(id: string, status: EnrollmentStatus): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('user')
      .populate({
        path: 'courseDate',
        populate: { path: 'course' }
      })
      .populate('payment')
      .exec();

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // If status is confirmed, send confirmation email
    if (status === EnrollmentStatus.CONFIRMED && enrollment.user.email) {
      const courseData = {
        title: enrollment.courseDate.course.title,
        selectedDate: enrollment.courseDate.startDate,
        zoomLink: enrollment.courseDate.meetingUrl || '',
        zoomMeetingId: enrollment.courseDate.zoomMeetingId || '',
        zoomPassword: enrollment.courseDate.zoomPassword || '',
        instructor: enrollment.courseDate.instructor.name
      };

      await this.emailService.sendCourseAccessEmail(enrollment.user.email, courseData);

      // Mark that email was sent
      enrollment.emailSent = true;
      enrollment.emailSentDate = new Date();
      await enrollment.save();
    }

    return enrollment;
  }

  async cancel(id: string, reason?: string): Promise<Enrollment> {
    const enrollment = await this.findOne(id);

    // Update status to canceled
    enrollment.status = EnrollmentStatus.CANCELED;

    // Add cancellation reason if provided
    if (reason) {
      enrollment.metadata = {
        ...enrollment.metadata,
        cancellationReason: reason
      };
    }

    await enrollment.save();

    // Remove user from course date enrolled users
    await this.courseDatesService.removeEnrolledUser(
      enrollment.courseDate._id.toString(),
      enrollment.user._id.toString()
    );

    return enrollment;
  }

  async provideFeedback(id: string, feedback: string, rating: number): Promise<Enrollment> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const enrollment = await this.findOne(id);

    // Only allow feedback for completed courses
    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Feedback can only be provided for completed courses');
    }

    enrollment.feedback = feedback;
    enrollment.feedbackRating = rating;

    return enrollment.save();
  }
}