import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // Specify NestExpressApplication as the type
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix("api");

  // Now this method will be recognized
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();