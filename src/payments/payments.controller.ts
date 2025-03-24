import { Controller, Post, Body, Get, Param, Headers, Req, HttpCode } from '@nestjs/common';
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

  @Get('verify-session/:sessionId')
  verifySession(@Param('sessionId') sessionId: string) {
    return this.paymentsService.verifySession(sessionId);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    return this.paymentsService.handleWebhook(signature, request.body);
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
