import type { Provider, GenJobInput } from './index.js';
import { logger } from '../logger.js';

export const pikaProvider: Provider = {
  name: 'pika',

  async createJob(input: GenJobInput): Promise<{ jobId: string } | { url: string }> {
    // TODO: Implement Pika Labs API integration
    // - Use Pika Labs API to create video/image generation jobs
    // - Return jobId for async jobs or url for immediate results
    // - Store job state in job store for streaming

    logger.warn({ kind: input.kind }, 'Pika provider not yet implemented, returning demo response');

    // Stub: return demo-like response for now
    if (input.kind === 'video') {
      // TODO: Call Pika Labs API
      // const response = await pikaApi.createVideo({ prompt: input.prompt, ... });
      // return { jobId: response.jobId };
      throw new Error('Pika video generation not yet implemented');
    }

    if (input.kind === 'image') {
      // TODO: Call Pika Labs API
      // const response = await pikaApi.createImage({ prompt: input.prompt, ... });
      // return { url: response.url };
      throw new Error('Pika image generation not yet implemented');
    }

    throw new Error(`Pika provider does not support ${input.kind} generation`);
  },

  // TODO: Implement job streaming for Pika jobs
  // async streamJob(jobId: string, send: (ev: string, data: any) => void): Promise<void> {
  //   // Poll Pika Labs API for job status
  //   // Send progress updates via send('progress', { progress: number })
  //   // Send completion via send('complete', { url: string })
  // }
};

