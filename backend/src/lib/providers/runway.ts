import type { Provider, GenJobInput } from './index.js';
import { logger } from '../logger.js';

export const runwayProvider: Provider = {
  name: 'runway',

  async createJob(input: GenJobInput): Promise<{ jobId: string } | { url: string }> {
    // TODO: Implement Runway ML API integration
    // - Use Runway ML API to create video/image generation jobs
    // - Return jobId for async jobs or url for immediate results
    // - Store job state in job store for streaming

    logger.warn({ kind: input.kind }, 'Runway provider not yet implemented, returning demo response');

    // Stub: return demo-like response for now
    if (input.kind === 'video') {
      // TODO: Call Runway ML API
      // const response = await runwayApi.createVideo({ prompt: input.prompt, ... });
      // return { jobId: response.jobId };
      throw new Error('Runway video generation not yet implemented');
    }

    if (input.kind === 'image') {
      // TODO: Call Runway ML API
      // const response = await runwayApi.createImage({ prompt: input.prompt, ... });
      // return { url: response.url };
      throw new Error('Runway image generation not yet implemented');
    }

    throw new Error(`Runway provider does not support ${input.kind} generation`);
  },

  // TODO: Implement job streaming for Runway jobs
  // async streamJob(jobId: string, send: (ev: string, data: any) => void): Promise<void> {
  //   // Poll Runway ML API for job status
  //   // Send progress updates via send('progress', { progress: number })
  //   // Send completion via send('complete', { url: string })
  // }
};

