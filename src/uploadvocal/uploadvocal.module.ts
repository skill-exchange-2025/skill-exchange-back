// src/uploadvocal/uploadvocal.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          // const ext = extname(file.originalname);
          // const filename = `${uniqueSuffix}${ext}`;
          // callback(null, filename);
          callback(null, `${uniqueSuffix}.mp3`);

        },
      }),
      fileFilter: (req, file, callback) => {
        // Accept only audio files
        if (file.mimetype === 'audio/mpeg') {
          callback(null, true);
        } else {
          callback(new Error('Only MP3 files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  ],
  controllers: [], // We'll add the controller later
  providers: [], // We'll add the service later
  exports: [MulterModule],
})
export class UploadvocalModule {}