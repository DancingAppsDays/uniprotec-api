import { Controller, Post, Body, Get, Param, Headers, Req, HttpCode, RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }


  @Post('create-checkout-session')
  createCheckoutSession(@Body() createCheckoutDto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(createCheckoutDto);
  }

  @Post('create-payment-intent')
createPaymentIntent(@Body() createPaymentDto: any) {
  return this.paymentsService.createPaymentIntent(createPaymentDto);
}

  @Get('verify-session/:sessionId')
  verifySession(@Param('sessionId') sessionId: string) {
    return this.paymentsService.verifySession(sessionId);
  }

  @Post('webhook/test')
@HttpCode(200)
testWebhook(@Body() data: any) {
  console.log('Testing webhook with payment intent:', data.paymentIntentId);
  return this.paymentsService.testWebhook(data.paymentIntentId);
}

@Post('webhook')
@HttpCode(200)
handleWebhook(
  @Headers('stripe-signature') signature: string,
  @Req() request: Request,
) {
  // With the bodyParser.raw middleware, request.body is the raw buffer for '/payments/webhook'
  return this.paymentsService.handleWebhook(signature, request.body);
}


@Post('webhooksss')
@HttpCode(200)
handleWebhook2(
  @Headers('stripe-signature') signature: string,
  @Req() request: RawBodyRequest<Request>,
) {
  // Use the raw body from the request for webhook verification
  const rawBody = request.rawBody;
  
  // Make sure we have a raw body
  if (!rawBody) {
    console.error('No raw body available for webhook verification');
    return { received: false, error: 'No raw body available' };
  }
  
  return this.paymentsService.handleWebhook(signature, rawBody);
}
}



  /*
    @Post()
    create(@Body() createPaymentDto: CreatePaymentDto) {
      return this.paymentsService.create(createPaymentDto);
    }
  
    @Get()
    findAll() {
      return this.paymentsService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.paymentsService.findOne(+id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
      return this.paymentsService.update(+id, updatePaymentDto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.paymentsService.remove(+id);
  }
}*/




