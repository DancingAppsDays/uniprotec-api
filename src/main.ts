import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
//import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3000'], // Add all your frontend origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });


  // Configure body parser to handle raw bodies for Stripe webhooks
  /*app.use((req, res, next) => {
    // For Stripe webhooks, use raw body parser
    if (req.originalUrl === '/payments/webhook') {
      bodyParser.raw({ type: 'application/json' })(req, res, next);
    } else {
      bodyParser.json()(req, res, next);
    }
  });*/

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next(); 
  });

  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
