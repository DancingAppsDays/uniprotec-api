// src/scheduled-tasks/scheduled-tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CourseDatesService } from '../course-date/course-date.service';
import { EnrollmentsService } from '../enrollment/enrollment.service';
import { EmailService } from '../email/email.service';
import { CourseDateStatus } from '../course-date/schemas/course-date.schema';
import { EnrollmentStatus } from '../enrollment/schemas/enrollment.schema';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly courseDatesService: CourseDatesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Run daily at 6:00 AM to check for course dates that need to be postponed
   * This checks all courses happening within the next 2 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkCoursesForPostponement() {
    this.logger.log('Running scheduled task: Check courses for postponement');
    try {
      const results = await this.courseDatesService.checkAllCoursesForPostponement();
      this.logger.log(`Postponement check completed: ${JSON.stringify(results)}`);
    } catch (error) {
      this.logger.error('Error in postponement check:', error);
    }
  }

  /**
   * Run daily at 9:00 AM to send reminders for upcoming courses
   * This sends reminders to students enrolled in courses happening in 3 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendCourseReminders() {
    this.logger.log('Running scheduled task: Send course reminders');
    try {
      // Get date 3 days from now
      const now = new Date();
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 3);

      // Get all confirmed course dates happening on that day
      const dateStart = new Date(targetDate);
      dateStart.setHours(0, 0, 0, 0);

      const dateEnd = new Date(targetDate);
      dateEnd.setHours(23, 59, 59, 999);

      const upcomingCourseDates = await this.courseDatesService.courseDateModel.find({
        startDate: {
          $gte: dateStart,
          $lte: dateEnd
        },
        status: CourseDateStatus.CONFIRMED
      })
        .populate('course')
        .exec();

      this.logger.log(`Found ${upcomingCourseDates.length} confirmed courses happening in 3 days`);

      // For each course date, get all confirmed enrollments and send reminders
      for (const courseDate of upcomingCourseDates) {
        const enrollments = await this.enrollmentsService.findByCourseDate(
          courseDate._id.toString(),
          EnrollmentStatus.CONFIRMED
        );

        this.logger.log(`Sending reminders for course ${courseDate.course.title} to ${enrollments.length} students`);

        for (const enrollment of enrollments) {
          if (enrollment.user.email) {
            const courseData = {
              title: courseDate.course.title,
              selectedDate: courseDate.startDate,
              zoomLink: courseDate.meetingUrl || '',
              zoomMeetingId: courseDate.zoomMeetingId || '',
              zoomPassword: courseDate.zoomPassword || '',
              instructor: courseDate.instructor.name
            };

            await this.emailService.sendReminderEmail(enrollment.user.email, courseData, 3);
          }
        }
      }

      this.logger.log('Course reminders sent successfully');
    } catch (error) {
      this.logger.error('Error sending course reminders:', error);
    }
  }

  /**
   * Run weekly to generate and send certificates for completed courses
   */
  @Cron(CronExpression.EVERY_WEEKEND)
  async generateAndSendCertificates() {
    this.logger.log('Running scheduled task: Generate and send certificates');
    try {
      // Get all completed enrollments that don't have certificates yet
      const completedEnrollments = await this.enrollmentsService.enrollmentModel.find({
        status: EnrollmentStatus.COMPLETED,
        certificateUrl: { $exists: false }
      })
        .populate('user')
        .populate({
          path: 'courseDate',
          populate: { path: 'course' }
        })
        .exec();

      this.logger.log(`Found ${completedEnrollments.length} enrollments needing certificates`);

      // In a real implementation, you would generate certificates here
      // For now, we'll just simulate the process
      for (const enrollment of completedEnrollments) {
        if (enrollment.user.email) {
          // Generate a fake certificate URL
          const certificateUrl = `https://uniprotec.com/certificates/${enrollment._id}`;

          // Update enrollment with certificate URL
          enrollment.certificateUrl = certificateUrl;
          await enrollment.save();

          // Send certificate email
          const userData = {
            fullName: enrollment.user.fullName || 'Participante'
          };

          const courseData = {
            title: enrollment.courseDate.course.title
          };

          await this.emailService.sendCertificateEmail(
            enrollment.user.email,
            userData,
            courseData,
            certificateUrl
          );
        }
      }

      this.logger.log('Certificates generated and sent successfully');
    } catch (error) {
      this.logger.error('Error generating and sending certificates:', error);
    }
  }
}