import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  // Configure body size limits
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ limit: '25mb', extended: true }));

  // Enable CORS for multiple frontends
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://192.168.50.4:5173',
      'http://http://192.168.50.4:80',
      'http://http://192.168.50.4',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  // Swagger API documentation setup
  const config = new DocumentBuilder()
    .setTitle('Skill Exchange API')
    .setDescription('API for the Skill Exchange platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('messaging')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Stripe webhook endpoint needs raw body parsing
  app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));

  // Serve static files (e.g. audio uploads)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      if (path.endsWith('.webm')) {
        res.set('Content-Type', 'audio/webm');
      } else if (path.endsWith('.mp3')) {
        res.set('Content-Type', 'audio/mpeg');
      } else if (path.endsWith('.wav')) {
        res.set('Content-Type', 'audio/wav');
      }
    },
  });

  // Prefix all API routes
  app.setGlobalPrefix('api');

  // Start application
  await app.listen(process.env.PORT ?? 5000);
}

bootstrap();
