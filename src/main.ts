import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 
  // Special raw body parser for Stripe webhooks
  app.use('/payments/webhook', 
    bodyParser.raw({ type: 'application/json' })
  );
  
  // Regular body parser for all other routes
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, {
//     bodyParser: false, // Disable built-in body parser for raw body access
//   });

    // Setup middleware to handle raw body for Stripe webhooks
    // app.use(
    //   express.json({
    //     verify: (req: any, res, buf) => {
    //       // Store the raw body for stripe webhook verification
    //       if (req.originalUrl === '/payments/webhook') {
    //         req.rawBody = buf;
    //       }
    //     },
    //   })
    // );

      // Ensure we have the regular body parser for all other routes
  //app.use(express.urlencoded({ extended: true }));
 
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3000', process.env.FRONTEND_URL ], // Add all your frontend origins
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

  const port = process.env.PORT || 8000;
  await app.listen(port);
  //await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
