import { createJob, updateJob } from '../jobs.js';
import { logger } from '../logger.js';
import type { Provider, GenJobInput } from './index.js';

// Demo video assets
const DEMO_VIDEOS = [
  '/public/broll_city_4s.mp4',
  '/public/broll_nature_3s.mp4',
];

// Demo image assets
const DEMO_IMAGES = [
  '/public/hero_image.jpg',
  '/public/thumbnail.jpg',
];

// Demo voice asset
const DEMO_VOICE = '/public/voice_sample.wav';

// Simulate progress updates for a job
async function simulateProgress(
  jobId: string,
  duration: number = 3000,
  onComplete: (url: string) => void
) {
  const steps = [25, 50, 75, 100];
  const delay = duration / steps.length;

  for (const progress of steps) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    updateJob(jobId, { status: 'generating', progress });
  }

  // Select a demo video based on jobId hash for consistency
  const videoIndex = parseInt(jobId.slice(0, 8), 16) % DEMO_VIDEOS.length;
  const url = DEMO_VIDEOS[videoIndex];
  updateJob(jobId, { status: 'complete', progress: 100, url });
  onComplete(url);
}

export const demoProvider: Provider = {
  name: 'demo',

  async createJob(input: GenJobInput): Promise<{ jobId: string } | { url: string }> {
    if (input.kind === 'video') {
      const jobId = createJob('queued', input.kind);
      logger.info({ jobId, prompt: input.prompt }, 'Demo video generation started');

      // Start simulation in background
      simulateProgress(jobId, 3000, (url) => {
        logger.info({ jobId, url }, 'Demo video generation completed');
      }).catch((error) => {
        logger.error(
          { jobId, error: error instanceof Error ? error.message : String(error) },
          'Demo video generation failed'
        );
        updateJob(jobId, { status: 'error', error: 'Generation failed' });
      });

      return { jobId };
    }

    if (input.kind === 'image') {
      // For demo, return URL immediately (no async job needed)
      // Select a demo image based on prompt hash for consistency
      const promptHash = input.prompt ? input.prompt.length : 0;
      const imageIndex = promptHash % DEMO_IMAGES.length;
      const url = DEMO_IMAGES[imageIndex];

      logger.info({ url, prompt: input.prompt }, 'Demo image generation completed');
      return { url };
    }

    if (input.kind === 'voice') {
      // For demo, return URL immediately (no async job needed)
      const url = DEMO_VOICE;

      logger.info({ url, text: input.text }, 'Demo voice generation completed');
      return { url };
    }

    throw new Error(`Unsupported generation kind: ${input.kind}`);
  },
};
