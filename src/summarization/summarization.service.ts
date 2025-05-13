import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SummarizationService implements OnModuleInit {
  private pipeline: any = null;
  private isModelLoading = false;

  async onModuleInit() {
    await this.loadModel();
  }

  private async loadModel() {
    if (this.pipeline !== null || this.isModelLoading) return;

    try {
      this.isModelLoading = true;
      console.log('Loading summarization model...');

      // Use dynamic import to load the ESM module only at runtime
      const transformers = await Function(
        'return import("@xenova/transformers")'
      )();

      this.pipeline = await transformers.pipeline(
        'summarization',
        'Xenova/t5-small'
      );

      console.log('Summarization model loaded successfully');
    } catch (error) {
      console.error('Failed to load summarization model:', error);
    } finally {
      this.isModelLoading = false;
    }
  }

  async summarizeText(text: string): Promise<string> {
    if (!this.pipeline) {
      if (!this.isModelLoading) {
        await this.loadModel();
      }
      throw new Error('Model is still loading. Please try again in a moment.');
    }

    try {
      const input = `summarize: ${text}`;
      const result = await this.pipeline(input, {
        max_length: 150,
        min_length: 30,
      });

      return result[0].summary_text;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  isModelReady(): boolean {
    return this.pipeline !== null;
  }
}
