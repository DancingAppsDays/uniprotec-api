// src/payments/payments.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

import { CoursesService } from '../courses/courses.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private courseService: CoursesService, // Add this
    private emailService: EmailService,    // Add this
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });
  }

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

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
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
  const payment = await this.paymentModel.findOne({ stripeSessionId: session.id });

  if (payment) {
    payment.status = 'completed';
    payment.stripePaymentIntentId = session.payment_intent as string;
    await payment.save();

    // Fetch course details
    const course = await this.courseService.findOne(payment.course.toString());
    
    // Send course access email
    if (payment.customerEmail && course) {
      // For now, using mock Zoom data - in production this would come from your Zoom API integration
      const zoomData = {
        title: course.title,
        selectedDate: payment.selectedDate,
        zoomLink: 'https://zoom.us/j/1234567890?pwd=abcdef',
        zoomMeetingId: '123 456 7890',
        zoomPassword: 'abcdef'
      };
      
      await this.emailService.sendCourseAccessEmail(payment.customerEmail, zoomData);
    }
  }
}

  private async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel.findOne({ stripePaymentIntentId: paymentIntent.id });

    if (payment) {
      payment.status = 'completed';
      await payment.save();
    }
  }
}