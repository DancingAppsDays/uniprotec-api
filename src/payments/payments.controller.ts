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
  // Use RawBodyRequest to get access to the raw body
  handleWebhook(
    @Headers('stripe-signature') signature: string,
    //@Req() request: RawBodyRequest<Request>,
    @Req() request: Request,
  ) {
    console.log('###Received webhook with signature:', signature);
    //console.log('###Received webhook with headers:', request);
    console.log(request);
   // console.log('###Received webhook with raw body:', request?.rawBody?.toString());
    if (!request) {
      throw new Error('Raw body is missing in the request');
    }
    // Pass the raw body to the service
    return this.paymentsService.handleWebhook(signature, request);
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
  }*/



}
