import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  // Create app with rawBody option for Stripe webhooks
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Set up global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Skill Exchange API')
    .setDescription('API for the Skill Exchange platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Create a raw body parser middleware for Stripe webhooks
  app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));

  // Set global prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 5000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
