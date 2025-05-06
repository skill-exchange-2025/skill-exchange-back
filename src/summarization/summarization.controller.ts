import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SummarizationService } from './summarization.service';

class SummarizeDto {
  text: string;
}

@Controller('summarize')
export class SummarizationController {
  constructor(private readonly summarizationService: SummarizationService) {}

  @Post()
  async summarize(@Body() dto: SummarizeDto) {
    if (!dto.text || dto.text.trim() === '') {
      throw new HttpException('Text is required', HttpStatus.BAD_REQUEST);
    }

    try {
      if (!this.summarizationService.isModelReady()) {
        return {
          message: 'Model is still loading. Please retry in a few seconds.',
          status: 'loading',
        };
      }

      const summary = await this.summarizationService.summarizeText(dto.text);
      return { summary };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate summary',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
