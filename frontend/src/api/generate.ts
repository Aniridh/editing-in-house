import { apiPost } from './client';
import type { GenerateResponse } from '../types';

export async function generateVideo(
  prompt: string,
  duration?: number,
  aspectRatio?: string,
  demoMode: boolean = false
): Promise<{ jobId: string; url?: string }> {
  if (demoMode) {
    const { mockGenerateVideo } = await import('./mockApi');
    return mockGenerateVideo(prompt, duration, aspectRatio);
  }

  const response = await apiPost<GenerateResponse>('/api/generate/video', {
    prompt,
    duration,
    aspectRatio,
  });
  return { jobId: response.jobId, url: response.url };
}

export async function generateImage(
  prompt: string,
  aspectRatio?: string,
  demoMode: boolean = false
): Promise<{ jobId: string; url?: string }> {
  if (demoMode) {
    const { mockGenerateImage } = await import('./mockApi');
    return mockGenerateImage(prompt, aspectRatio);
  }

  const response = await apiPost<GenerateResponse>('/api/generate/image', {
    prompt,
    aspectRatio,
  });
  return { jobId: response.jobId, url: response.url };
}

export async function generateVoiceover(
  text: string,
  voice?: string,
  demoMode: boolean = false
): Promise<{ jobId: string; url?: string }> {
  if (demoMode) {
    const { mockGenerateVoiceover } = await import('./mockApi');
    return mockGenerateVoiceover(text, voice);
  }

  const response = await apiPost<GenerateResponse>('/api/generate/voiceover', {
    text,
    voice,
  });
  return { jobId: response.jobId, url: response.url };
}
