import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  app.enableCors({
    origin: ['http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

 
 

  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Skill Exchange API')
    .setDescription('API for the Skill Exchange platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('messaging')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Create a raw body parser middleware for Stripe webhooks
  app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
