import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
<<<<<<< Updated upstream
=======


 // Enable CORS
 app.enableCors({
  origin: 'http://localhost:5173', 
  credentials: true,
});


  
>>>>>>> Stashed changes
  await app.listen(process.env.PORT ?? 5000);

  app.setGlobalPrefix('api');
}
bootstrap();
