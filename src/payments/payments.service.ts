import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CourseDatesService } from '../course-date/course-date.service';
import { EnrollmentsService } from '../enrollment/enrollment.service';
import { EmailService } from '../email/email.service';
import { Enrollment, EnrollmentStatus } from '../enrollment/schemas/enrollment.schema';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CourseDate, CourseDateDocument } from 'src/course-date/schemas/course-date.schema';
import { Course } from 'src/courses/schemas/course.schema';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(CourseDate.name) private courseDateModel: Model<CourseDateDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDateDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<CourseDateDocument>,
    private configService: ConfigService,
    private courseDatesService: CourseDatesService,
    private enrollmentsService: EnrollmentsService,
    private emailService: EmailService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });
  }

  async createPaymentIntent(data: any): Promise<{ clientSecret: string | null}> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(data.price * 100),
        currency: 'mxn',
        payment_method_types: ['card'],
        metadata: {
          course_id: data.courseId,
          selected_date: data.selectedDate || '',
          user_id: data.userId || '',
        },
      });
  
      // Save payment info to database
      await this.paymentModel.create({
        amount: data.price,
        currency: 'mxn',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        customerEmail: data.customerEmail,
        selectedDate: data.selectedDate,
        course: data.courseId,
        userId: data.userId,
        metadata: {
          courseTitle: data.courseTitle,
          quantity: data.quantity,
        },
      });
  
      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new BadRequestException(error.message);
    }
  }






  async testWebhook(paymentIntentId: string): Promise<any> {
    try {
      // Fetch the payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Process it as if it came from a webhook
      await this.handleSuccessfulPayment(paymentIntent);
      
      return { success: true, message: 'Webhook test processed successfully' };
    } catch (error) {
      console.error('Test webhook failed:', error);
      throw new InternalServerErrorException('Webhook test failed: ' + error.message);
    }
  }









  //deprecated in favor of elements, which is embed and requiered client secret
  async createCheckoutSession(createCheckoutDto: CreateCheckoutDto) {
    try {
      const { courseId, courseTitle, price, quantity, customerEmail, selectedDate, successUrl, cancelUrl, userId } = createCheckoutDto;

      // Create line items for Stripe
      const lineItems = [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: courseTitle,
            description: `Fecha: ${selectedDate || 'N/A'}`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity,
      }];

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          course_id: courseId,
          selected_date: selectedDate || '',
          user_id: userId || '',
        },
      });

      // Save payment info to database
      await this.paymentModel.create({
      //  _id: new mongoose.Types.ObjectId().toString(), // Generate a new MongoDB ID
        amount: price,
        currency: 'mxn',
        status: 'pending',
        stripeSessionId: session.id,
        customerEmail,
        selectedDate,
        course: courseId,
        userId: userId,
        metadata: {
          courseTitle,
          quantity,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Stripe error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error creating checkout session');
    }
  }

  async verifySession(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      const payment = await this.paymentModel.findOne({ stripeSessionId: sessionId });
      if (!payment) {
        return { success: false, error: 'Payment record not found' };
      }

      if (session.payment_status === 'paid') {
        payment.status = 'completed';
        payment.stripePaymentIntentId = session.payment_intent as string;
        await payment.save();

        return {
          success: true,
          orderId: payment._id,
        };
      }

      return {
        success: false,
        status: session.payment_status,
      };
    } catch (error) {
      console.error('Verification error:', error);
      throw new InternalServerErrorException('Unable to verify payment');
    }
  }


  async handleWebhook(signature: string, payload: Buffer | string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
    }
  
    console.log("Webhook secret:", webhookSecret);
    console.log("Signature:", signature);
    console.log(payload)
    
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
  
      console.log("Event type:", event.type);
      
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCompletedCheckout(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          await this.handleSuccessfulPayment(event.data.object as Stripe.PaymentIntent);
          break;
      }
  
      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }


  //FOR TESTING ONLY
  async handleWebhooktest(signature: string, payload: any): Promise<{ received: boolean }> {
    try {
      let event;
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
  
      // For testing: if payload is not a buffer, assume it's the parsed JSON
      if (Buffer.isBuffer(payload)) {
        // Normal path with signature verification
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret || ''
        );
      } else {
        // Alternative path for testing: use the parsed body directly
        console.warn('Using parsed body without signature verification (for testing only)');
        event = payload;
      }
  
      console.log('Processing Stripe event:', event.type);
  
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCompletedCheckout(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handleSuccessfulPayment(event.data.object);
          break;
      }
  
      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  async handleWebhooklegacyE(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    console.log("Webhook secret:", webhookSecret);
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCompletedCheckout(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          await this.handleSuccessfulPayment(event.data.object as Stripe.PaymentIntent);
          break;
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }


  
private async handleCompletedCheckout(session: Stripe.Checkout.Session) {
  console.log("Starting handleCompletedCheckout with session ID:", session.id);
  console.log("Session metadata:", session.metadata);
  
  const payment = await this.paymentModel.findOne({ stripeSessionId: session.id });
  console.log("Found payment record:", payment ? "Yes" : "No");

  if (payment) {
    console.log("Payment details:", {
      id: payment._id,
      status: payment.status,
      course: payment.course,
      userId: payment.userId,
      selectedDate: payment.selectedDate
    });
    
    payment.status = 'completed';
    payment.stripePaymentIntentId = session.payment_intent as string;
    await payment.save();
    console.log("Payment status updated to completed");

    // Create enrollment if this payment was for a course
    if (payment.course && payment.selectedDate && payment.userId) {
      try {
        console.log("Starting enrollment creation process");
        
        // Find the appropriate course date based on the selected date
        const courseDates = await this.courseDatesService.findByCourse(payment.course.toString());
        console.log(`Found ${courseDates.length} course dates for course:`, payment.course);

        let targetCourseDate;
        const selectedDate = new Date(payment.selectedDate);
        console.log("Looking for course date matching:", selectedDate.toISOString());

        // Find the course date that matches the selected date
        for (const courseDate of courseDates) {
          const courseDateStart = new Date(courseDate.startDate);
          console.log("Comparing with course date:", courseDateStart.toISOString());

          // Compare dates without time component
          if (
            courseDateStart.getFullYear() === selectedDate.getFullYear() &&
            courseDateStart.getMonth() === selectedDate.getMonth() &&
            courseDateStart.getDate() === selectedDate.getDate()
          ) {
            targetCourseDate = courseDate;
            console.log("Match found! Course date ID:", courseDate._id);
            break;
          }
        }

        if (targetCourseDate) {
          console.log("Creating enrollment with:", {
            userId: payment.userId.toString(),
            courseDateId: targetCourseDate._id,
            paymentId: payment._id!.toString()
          });
          
          // Create enrollment
          try {
            const enrollment = await this.enrollmentsService.create({
              user: payment.userId.toString(),
              courseDate: targetCourseDate._id,
              status: EnrollmentStatus.CONFIRMED,
              payment: payment._id!.toString(),
              metadata: {
                paymentMethod: 'stripe',
                paymentSessionId: session.id,
                paymentIntentId: session.payment_intent
              }
            });
            console.log("Enrollment created successfully:");//, enrollment._id);
          } catch (enrollError) {
            console.error("Error during enrollment creation:", enrollError);
          }
        } else {
          console.error('No matching course date found for the selected date:', payment.selectedDate);
        }
      } catch (error) {
        console.error('Error in enrollment creation process:', error);
      }
    } else {
      console.log("Missing required fields for enrollment:", {
        hasCourse: !!payment.course,
        hasSelectedDate: !!payment.selectedDate,
        hasUserId: !!payment.userId
      });
    }

    // Send course access email
    if (payment.customerEmail) {
      try {
        console.log("Attempting to send course access email to:", payment.customerEmail);
        // Code for sending email...
      } catch (error) {
        console.error('Error sending course access email:', error);
      }
    }
  } else {
    console.error('No payment record found for session ID:', session.id);
  }
}



/*
  private async handleCompletedCheckoutLEGACY(session: Stripe.Checkout.Session) {
    const payment = await this.paymentModel.findOne({ stripeSessionId: session.id });
    
    if (payment) {
      payment.status = 'completed';
      payment.stripePaymentIntentId = session.payment_intent as string;
      await payment.save();

      // Create enrollment if this payment was for a course
      if (payment.course && payment.selectedDate && payment.userId) {
        try {
          // Find the appropriate course date based on the selected date
          const courseDates = await this.courseDatesService.findByCourse(payment.course.toString());

          let targetCourseDate;
          const selectedDate = new Date(payment.selectedDate);

          // Find the course date that matches the selected date
          for (const courseDate of courseDates) {
            const courseDateStart = new Date(courseDate.startDate);

            // Compare dates without time component
            if (
              courseDateStart.getFullYear() === selectedDate.getFullYear() &&
              courseDateStart.getMonth() === selectedDate.getMonth() &&
              courseDateStart.getDate() === selectedDate.getDate()
            ) {
              targetCourseDate = courseDate;
              break;
            }
          }

          if (targetCourseDate) {
            // Create enrollment
            await this.enrollmentsService.create({
              user: payment.userId.toString(),
              courseDate: targetCourseDate.id,
              status: EnrollmentStatus.CONFIRMED,
              payment: payment._id!.toString(),
              metadata: {
                paymentMethod: 'stripe',
                paymentSessionId: session.id,
                paymentIntentId: session.payment_intent
              }
            });

            console.log(`Enrollment created for user ${payment.userId} in course date ${targetCourseDate.id}`);
          } else {
            console.error('No matching course date found for the selected date:', payment.selectedDate);
          }
        } catch (error) {
          console.error('Error creating enrollment:', error);
        }
      }

      // Send course access email
      if (payment.customerEmail) {
        try {
          // Try to get course details and send email
          const courseDates = await this.courseDatesService.findByCourse(payment.course.toString());

          if (courseDates && courseDates.length > 0) {
            // Use the first course date for now (this should be improved to find the right one)
            const courseDate = courseDates[0];

            // For Zoom data - in a real implementation, you'd get this from the courseDate
            const zoomData = {
              title: payment.metadata?.courseTitle || 'Course',
              selectedDate: payment.selectedDate,
              zoomLink: courseDate.meetingUrl || 'https://zoom.us/meeting-link',
              zoomMeetingId: courseDate.zoomMeetingId || '123 456 7890',
              zoomPassword: courseDate.zoomPassword || 'password'
            };

            await this.emailService.sendCourseAccessEmail(payment.customerEmail, zoomData);
          }
        } catch (error) {
          console.error('Error sending course access email:', error);
        }
      }
    }
  }*/

  private async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    console.log("Starting handleSuccessfulPayment with payment intent ID:", paymentIntent.id);
    console.log("Payment intent metadata:", paymentIntent.metadata);

    const payment = await this.paymentModel.findOne({ stripePaymentIntentId: paymentIntent.id });
    
    console.log("Found payment record:", payment ? "Yes" : "No");
    console.log("Payment details:",payment);

    if (payment) {
      payment.status = 'completed';
      await payment.save();
      
      // Create enrollment if this payment was for a course
      if (payment.course && payment.selectedDate && payment.userId) {
        try {
          // Find the appropriate course date based on the selected date
          const courseDates = await this.courseDateModel.find({
            course: payment.course
          }).exec();
          
          let targetCourseDate;
          if (payment.selectedDate) {
            const selectedDate = new Date(payment.selectedDate);
            
            // Find the course date that matches the selected date
            for (const courseDate of courseDates) {
              const courseDateStart = new Date(courseDate.startDate);
              
              // Compare dates without time component
              if (
                courseDateStart.getFullYear() === selectedDate.getFullYear() &&
                courseDateStart.getMonth() === selectedDate.getMonth() &&
                courseDateStart.getDate() === selectedDate.getDate()
              ) {
                targetCourseDate = courseDate;
                break;
              }
            }
          }

          console.log("Target course date:", targetCourseDate);
          
          if (targetCourseDate) {
            // Create enrollment
            await this.enrollmentsService.create({
              user: payment.userId.toString(),
              courseDate: targetCourseDate._id.toString(),
              status: EnrollmentStatus.CONFIRMED,
              payment: (payment._id as mongoose.Types.ObjectId).toString(), //experimental
              metadata: {
                paymentMethod: 'stripe',
                paymentIntentId: paymentIntent.id
              }
            });
            
            console.log(`Enrollment created for user ${payment.userId} in course date ${targetCourseDate._id}`);
          }
        } catch (error) {
          console.error('Error creating enrollment:', error);
        }
      }
    }
  }


  //requiered to prevent paying before checking duplicate enrollments
  async validatePaymentRequest(
    courseId: string,
    selectedDateStr: string,
    userId: string
  ): Promise<{ valid: boolean; message?: string }> {
    // Skip validation if userId is empty (will use email fallback later)
    if (!userId) {
      return { valid: false, message: 'User ID ERROR in payment not found' };
    }

    console.log(courseId, selectedDateStr, userId);
    
    try {
      // Check if course exists
      const course = await this.courseModel.findById(courseId).exec();
      if (!course) {
        return { valid: false, message: 'Course not found' };
      }

      const selectedDate = new Date(selectedDateStr);
      const courseDates = await this.courseDateModel.find({
        course: courseId
      }).exec();

      let targetCourseDate;
      for (const courseDate of courseDates) {
        const courseDateStart = new Date(courseDate.startDate);
        
        // Compare dates without time component
        if (
          courseDateStart.getFullYear() === selectedDate.getFullYear() &&
          courseDateStart.getMonth() === selectedDate.getMonth() &&
          courseDateStart.getDate() === selectedDate.getDate()
        ) {
          targetCourseDate = courseDate;
          break;
        }
      }
      
      if (!targetCourseDate) {
        return { valid: false, message: 'Invalid course date selected' };
      }
      
      if (targetCourseDate.enrolledCount >= targetCourseDate.capacity) {
        return { valid: false, message: 'Este curso ya no tiene lugares disponibles' };
      }

       // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentModel.findOne({
      user: userId,
      courseDate: targetCourseDate._id,
      status: { $nin: ['canceled', 'refunded'] }
    }).exec();
    
    if (existingEnrollment) {
      return { 
        valid: false, 
        message: 'Ya estás inscrito en este curso' 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Payment validation error:', error);
    return { valid: false, message: 'Falló la validación del pago' };
  }

      //TODO CHECK IF  this apraoch is affected by multiple same course dates on same day
      //previous implemataion, required coursedateid, which is not supported but might be
      /*
      // Check if course date exists and has capacity
      const courseDate = await this.courseDateModel.findById(courseDateId).exec();
      if (!courseDate) {
        return { valid: false, message: 'Course date not found' };
      }
      
      if (courseDate.enrolledCount >= courseDate.capacity) {
        return { valid: false, message: 'This course date is at full capacity' };
      }
      
      // Check if user is already enrolled
      const enrollments = await this.enrollmentsService.findByCourseDate(courseDateId);
      const userEnrollment = enrollments.find(e => 
        e.user._id.toString() === userId && 
        e.status !== 'canceled' && 
        e.status !== 'refunded'
      );
      
      if (userEnrollment) {
        return { 
          valid: false, 
          message: 'You are already enrolled in this course' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Payment validation error:', error);
      return { valid: false, message: 'Failed to validate payment request' };
    }*/
  }
}