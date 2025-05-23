// src/course-dates/course-dates.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCourseDateDto } from './dto/create-course-date.dto';
import { UpdateCourseDateDto } from './dto/update-course-date.dto';
import { CourseDate, CourseDateDocument, CourseDateStatus } from './schemas/course-date.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { PostponementPolicy, PostponementPolicyDocument } from '../postponement-policy/schemas/postponement-policy.schema';
import { EmailService } from '../email/email.service';
import { FilterCourseDatesDto } from './dto/filter-course-dates-dto';
import { User, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class CourseDatesService {
  constructor(
    @InjectModel(CourseDate.name) public courseDateModel: Model<CourseDateDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(PostponementPolicy.name) private policyModel: Model<PostponementPolicyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) { }

  async create(createCourseDateDto: CreateCourseDateDto): Promise<CourseDate> {
    // Check if course exists
    const course = await this.courseModel.findById(createCourseDateDto.course).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${createCourseDateDto.course} not found`);
    }

    const newCourseDate = new this.courseDateModel(createCourseDateDto);
    return newCourseDate.save();
  }
  async findAll(filterDto?: FilterCourseDatesDto | CourseDateStatus, featured?: boolean): Promise<CourseDate[]> {
    let query = this.courseDateModel.find().populate('course');

    if (filterDto) {
      if (typeof filterDto === 'string') {
        // Handle the case when it's a status string
        query = query.where('status').equals(filterDto);
      } else {
        // Handle the case when it's a FilterCourseDatesDto object
        if (filterDto.status) {
          query = query.where('status').equals(filterDto.status);
        }

        if (filterDto.startDateFrom) {
          query = query.where('startDate').gte(filterDto.startDateFrom.getTime());
        }

        if (filterDto.startDateTo) {
          query = query.where('startDate').lte(filterDto.startDateTo.getTime());
        }

        // Add more filter conditions as needed
      }
    }

    if (featured === true) {
      query = query.populate({
        path: 'course',
        match: { featured: true }
      });
    }

    const results = await query.exec();

    if (featured === true) {
      // Filter out null courses (those that don't match the featured criteria)
      return results.filter(result => result.course);
    }

    return results;
  }

  async findUpcoming(limit?: number): Promise<CourseDate[]> {
    const now = new Date();
    let query = this.courseDateModel.find({
      startDate: { $gt: now },
      status: { $in: [CourseDateStatus.SCHEDULED, CourseDateStatus.CONFIRMED] }
    })
      .populate('course')
      .sort({ startDate: 1 });

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }

  async findByCourse(courseId: string): Promise<CourseDate[]> {
    return this.courseDateModel.find({ course: courseId })
      .populate('course')
      .sort({ startDate: 1 })
      .exec();
  }

  async findOne(id: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findById(id)
      .populate('course')
      .populate('enrolledUsers')
      .exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    return courseDate;
  }

  async update(id: string, updateCourseDateDto: UpdateCourseDateDto): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findByIdAndUpdate(
      id,
      updateCourseDateDto,
      { new: true }
    )
      .populate('course')
      .exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    return courseDate;
  }

  async updateStatus(id: string, status: CourseDateStatus): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('course')
      .exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    // If the course is being confirmed, notify enrolled users
    if (status === CourseDateStatus.CONFIRMED) {
      await this.notifyUsersOfConfirmation(courseDate);
    }

    return courseDate;
  }

  async remove(id: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findByIdAndDelete(id).exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    return courseDate;
  }

  async postponeCourse(id: string, newDate?: Date, reason?: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findById(id)
      .populate('course')
      .populate('enrolledUsers')
      .exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    // Update the status to postponed
    courseDate.status = CourseDateStatus.POSTPONED;

    // If a new date is provided, create a new course date with the same details
    if (newDate) {
      const endDate = new Date(newDate);
      // Calculate duration based on the original start and end dates
      const originalDuration = courseDate.endDate.getTime() - courseDate.startDate.getTime();
      // Apply the same duration to the new end date
      endDate.setTime(endDate.getTime() + originalDuration);

      const newCourseDate = new this.courseDateModel({
        course: courseDate.course,
        startDate: newDate,
        endDate: endDate,
        capacity: courseDate.capacity,
        enrolledCount: courseDate.enrolledCount,
        instructor: courseDate.instructor,
        location: courseDate.location,
        meetingUrl: courseDate.meetingUrl,
        status: CourseDateStatus.SCHEDULED,
        minimumRequired: courseDate.minimumRequired,
        enrolledUsers: courseDate.enrolledUsers,
        zoomMeetingId: courseDate.zoomMeetingId,
        zoomPassword: courseDate.zoomPassword,
        notes: courseDate.notes
      });

      await newCourseDate.save();

      // Store the new course date ID in metadata for reference
      courseDate.metadata = {
        ...courseDate.metadata,
        rescheduledTo: newCourseDate._id,
        postponementReason: reason
      };
    } else {
      courseDate.metadata = {
        ...courseDate.metadata,
        postponementReason: reason
      };
    }

    await courseDate.save();

    // Notify enrolled users about postponement
    await this.notifyUsersOfPostponement(courseDate, newDate, reason);

    return courseDate;
  }

  async cancelCourse(id: string, reason?: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findById(id)
      .populate('course')
      .populate('enrolledUsers')
      .exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${id} not found`);
    }

    // Update the status to canceled
    courseDate.status = CourseDateStatus.CANCELED;

    if (reason) {
      courseDate.metadata = {
        ...courseDate.metadata,
        cancellationReason: reason
      };
    }

    await courseDate.save();

    // Notify enrolled users about cancellation
    await this.notifyUsersOfCancellation(courseDate, reason);

    return courseDate;
  }

  async addEnrolledUser(courseDateId: string, userId: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findById(courseDateId).exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${courseDateId} not found`);
    }

    // Check if the user is already enrolled
    if (courseDate.enrolledUsers && courseDate.enrolledUsers.includes(userId)) {
      //TODO CHECK LOGIC turns on this //THIS SHOULD BE BLOCKED BEFORE PAYMENT, NOT HERE
      //throw new BadRequestException('User is already enrolled in this course date');
    }

    // Check if the course is full
    if (courseDate.enrolledCount >= courseDate.capacity) {
      
      //THIS SHOULD BE BLOCKED BEFORE PAYMENT, NOT HERE
      //TODO CHECK LOGIC turns on this
      //throw new BadRequestException('This course date is already at full capacity');
    }

    // Add the user to enrolled users and increment the count
    courseDate.enrolledUsers.push(userId);
    courseDate.enrolledCount += 1;

    // If enrollment meets minimum requirements and course was scheduled, mark as confirmed
    if (courseDate.status === CourseDateStatus.SCHEDULED &&
      courseDate.enrolledCount >= courseDate.minimumRequired) {
      courseDate.status = CourseDateStatus.CONFIRMED;
    }

    return courseDate.save();
  }

  async removeEnrolledUser(courseDateId: string, userId: string): Promise<CourseDate> {
    const courseDate = await this.courseDateModel.findById(courseDateId).exec();

    if (!courseDate) {
      throw new NotFoundException(`Course date with ID ${courseDateId} not found`);
    }

    // Check if the user is enrolled
    const userIndex = courseDate.enrolledUsers.indexOf(userId);
    if (userIndex === -1) {
      throw new BadRequestException('User is not enrolled in this course date');
    }

    // Remove the user from enrolled users and decrement the count
    courseDate.enrolledUsers.splice(userIndex, 1);
    courseDate.enrolledCount -= 1;

    // If enrollment falls below minimum requirements and course was confirmed, mark as scheduled
    if (courseDate.status === CourseDateStatus.CONFIRMED &&
      courseDate.enrolledCount < courseDate.minimumRequired) {
      courseDate.status = CourseDateStatus.SCHEDULED;
    }

    return courseDate.save();
  }

  async findUpcomingByDateRange(startDate: Date, endDate: Date): Promise<CourseDate[]> {
    return this.courseDateModel.find({
      startDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: CourseDateStatus.CONFIRMED
    })
      .populate('course')
      .exec();
  }









  async checkAllCoursesForPostponement(): Promise<any> {
    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Find all scheduled course dates coming up in the next 2 days
    const upcomingCourseDates = await this.courseDateModel.find({
      startDate: {
        $gt: now,
        $lt: twoDaysFromNow
      },
      status: CourseDateStatus.SCHEDULED
    })
      .populate('course')
      .populate('enrolledUsers')
      .exec();

    const results = {
      total: upcomingCourseDates.length,
      processed: 0,
      postponed: 0,
      confirmed: 0,
      errors: 0
    };

    // Check each course date
    for (const courseDate of upcomingCourseDates) {
      try {
        // Get postponement policy for this course
        const policy = await this.policyModel.findOne({
          course: courseDate.course._id
        }).exec();

        // Use course-specific policy or default values
        const minimumRequired = policy?.minimumRequired || courseDate.minimumRequired || 6;
        const enableAutoPostponement = policy?.enableAutoPostponement || false;

        if (courseDate.enrolledCount < minimumRequired) {
          if (enableAutoPostponement) {
            // Auto-postpone the course
            const defaultNextDate = policy?.defaultNextCourseDate;
            await this.postponeCourse(
              courseDate._id.toString(),
              defaultNextDate,
              'Insufficient enrollment'
            );
            results.postponed++;
          } else {
            // Just send notifications but don't auto-postpone
            await this.notifyUsersOfPossiblePostponement(courseDate);
          }
        } else {
          // Mark as confirmed since we have enough students
          await this.updateStatus(courseDate._id.toString(), CourseDateStatus.CONFIRMED);
          results.confirmed++;
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing course date ${courseDate._id}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  private async notifyUsersOfConfirmation(courseDate: CourseDate): Promise<void> {
    if (!courseDate.enrolledUsers || courseDate.enrolledUsers.length === 0) {
      return;
    }

    for (const userId of courseDate.enrolledUsers) {
      try {
        // Get the user first
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.email) continue;

        const courseData = {
          title: courseDate.course.title,
          selectedDate: courseDate.startDate,
          zoomLink: courseDate.meetingUrl || '',
          zoomMeetingId: courseDate.zoomMeetingId || '',
          zoomPassword: courseDate.zoomPassword || '',
          instructor: courseDate.instructor.name
        };

        await this.emailService.sendCourseAccessEmail(user.email, courseData);
      } catch (error) {
        console.error(`Error sending confirmation email to user ${userId}:`, error);
      }
    }
  }

  private async notifyUsersOfPostponement(
    courseDate: CourseDate,
    newDate?: Date,
    reason?: string
  ): Promise<void> {
    if (!courseDate.enrolledUsers || courseDate.enrolledUsers.length === 0) {
      return;
    }

    // Implementation would be similar to confirmation notifications
    // This would use EmailService to send postponement notifications
  }

  private async notifyUsersOfCancellation(
    courseDate: CourseDate,
    reason?: string
  ): Promise<void> {
    if (!courseDate.enrolledUsers || courseDate.enrolledUsers.length === 0) {
      return;
    }

    // Implementation would be similar to confirmation notifications
    // This would use EmailService to send cancellation notifications
  }

  private async notifyUsersOfPossiblePostponement(courseDate: CourseDate): Promise<void> {
    if (!courseDate.enrolledUsers || courseDate.enrolledUsers.length === 0) {
      return;
    }

    // Implementation would be similar to confirmation notifications
    // This would send warnings about possible postponement due to low enrollment
  }

  /*
  async reserveSeats(courseDateId: string, seatCount: number): Promise<CourseDate> {
  const courseDate = await this.courseDateModel.findById(courseDateId).exec();
  
  if (!courseDate) {
    throw new NotFoundException(`Course date with ID ${courseDateId} not found`);
  }
  
  // Check if there's enough capacity
  if (courseDate.enrolledCount + seatCount > courseDate.capacity) {
    throw new BadRequestException(
      `Cannot reserve ${seatCount} seats. Course date only has ${courseDate.capacity - courseDate.enrolledCount} seats available.`
    );
  }
  
  // Increase enrolled count to reserve seats
  courseDate.enrolledCount += seatCount;
  
  // If enrollment meets minimum requirements and course was scheduled, mark as confirmed
  if (courseDate.status === CourseDateStatus.SCHEDULED &&
      courseDate.enrolledCount >= courseDate.minimumRequired) {
    courseDate.status = CourseDateStatus.CONFIRMED;
  }
  
  // Save and return updated course date
  return courseDate.save();
}*/


  async reserveSeats(courseDateId: string, seatCount: number): Promise<CourseDate> {
  const courseDate = await this.courseDateModel.findById(courseDateId).exec();
  
  if (!courseDate) {
    throw new NotFoundException(`Course date with ID ${courseDateId} not found`);
  }
  
  // Check if there's enough capacity
  if (courseDate.enrolledCount + seatCount > courseDate.capacity) {
    throw new BadRequestException(
      `Cannot reserve ${seatCount} seats. Course date only has ${courseDate.capacity - courseDate.enrolledCount} seats available.`
    );
  }
  
  // Increase enrolled count to reserve seats
  courseDate.enrolledCount += seatCount;
  
  // If enrollment meets minimum requirements and course was scheduled, mark as confirmed
  if (courseDate.status === CourseDateStatus.SCHEDULED &&
      courseDate.enrolledCount >= courseDate.minimumRequired) {
    courseDate.status = CourseDateStatus.CONFIRMED;
  }
  
  // Save and return updated course date
  return courseDate.save();
}

/**
 * Reserve additional seats for an existing company purchase
 * Used when increasing quantity of a paid purchase
 * 
 * @param courseDateId Course date ID
 * @param additionalSeats Number of additional seats to reserve
 * @returns Updated course date
 */
async reserveAdditionalSeats(courseDateId: string, additionalSeats: number): Promise<CourseDate> {
  // This is effectively the same as reserveSeats but with a different name for clarity
  return this.reserveSeats(courseDateId, additionalSeats);
}

/**
 * Release seats that were previously reserved
 * Used when changing from paid status or reducing quantity
 * 
 * @param courseDateId Course date ID
 * @param seatCount Number of seats to release
 * @returns Updated course date
 */
async releaseSeats(courseDateId: string, seatCount: number): Promise<CourseDate> {
  const courseDate = await this.courseDateModel.findById(courseDateId).exec();
  
  if (!courseDate) {
    throw new NotFoundException(`Course date with ID ${courseDateId} not found`);
  }
  
  // Ensure we don't try to release more seats than are enrolled
  const seatsToRelease = Math.min(seatCount, courseDate.enrolledCount);
  
  // Decrease enrolled count to release seats
  courseDate.enrolledCount -= seatsToRelease;
  
  // If enrollment falls below minimum requirements and course was confirmed, consider reverting to scheduled
  if (courseDate.status === CourseDateStatus.CONFIRMED &&
      courseDate.enrolledCount < courseDate.minimumRequired) {
    
    // Only revert to scheduled if there are no actual enrollments (handled separately)
    // This would require checking if there are actual enrolled users vs. company reserved seats
    // For simplicity, we'll leave this behavior for now and assume admin will manually change if needed
    
    // Uncomment if you want automatic status change:
    // courseDate.status = CourseDateStatus.SCHEDULED;
  }
  
  // Save and return updated course date
  return courseDate.save();
}



}