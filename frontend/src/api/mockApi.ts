import type { Action, Asset } from '../types';
import { demoAssets } from '../demo/demoData';

// Mock delay to simulate API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockInterpret(prompt: string): Promise<Action[]> {
  await delay(300);

  const lowerPrompt = prompt.toLowerCase();

  // Simple keyword-based interpretation
  if (lowerPrompt.includes('generate') && (lowerPrompt.includes('video') || lowerPrompt.includes('clip'))) {
    const durationMatch = prompt.match(/(\d+)\s*(?:second|sec|s)/i);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) : 5;
    const aspectMatch = prompt.match(/(\d+):(\d+)|vertical|portrait|horizontal|landscape/i);
    let aspectRatio = '16:9';
    if (aspectMatch) {
      if (aspectMatch[0].toLowerCase().includes('vertical') || aspectMatch[0].toLowerCase().includes('portrait')) {
        aspectRatio = '9:16';
      } else if (aspectMatch[1] && aspectMatch[2]) {
        aspectRatio = `${aspectMatch[1]}:${aspectMatch[2]}`;
      }
    }
    const promptMatch = prompt.match(/generate\s+(?:video|clip)\s+(?:of|about|with)?\s*(.+)/i) || 
                       prompt.match(/generate\s+(.+?)(?:\s+\d+|$)/i);
    const genPrompt = promptMatch ? promptMatch[1].trim() : prompt.replace(/generate\s+(?:video|clip)\s*/i, '').trim();
    
    return [
      {
        type: 'generate_clip',
        prompt: genPrompt || 'a beautiful scene',
        duration_sec: duration,
        aspect: aspectRatio,
      } as Action,
    ];
  }

  if (lowerPrompt.includes('generate') && lowerPrompt.includes('image')) {
    const aspectMatch = prompt.match(/(\d+):(\d+)|vertical|portrait|horizontal|landscape/i);
    let aspectRatio = '16:9';
    if (aspectMatch) {
      if (aspectMatch[0].toLowerCase().includes('vertical') || aspectMatch[0].toLowerCase().includes('portrait')) {
        aspectRatio = '9:16';
      } else if (aspectMatch[1] && aspectMatch[2]) {
        aspectRatio = `${aspectMatch[1]}:${aspectMatch[2]}`;
      }
    }
    const promptMatch = prompt.match(/generate\s+image\s+(?:of|about|with)?\s*(.+)/i) ||
                       prompt.match(/generate\s+(.+?)(?:\s+image|$)/i);
    const genPrompt = promptMatch ? promptMatch[1].trim() : prompt.replace(/generate\s+image\s*/i, '').trim();
    
    return [
      {
        type: 'generate_image',
        prompt: genPrompt || 'a beautiful image',
        aspect: aspectRatio,
      } as Action,
    ];
  }

  if (lowerPrompt.includes('generate') && (lowerPrompt.includes('voice') || lowerPrompt.includes('audio'))) {
    const textMatch = prompt.match(/generate\s+(?:voice|audio|voiceover)\s+(?:of|saying|with)?\s*["'](.+?)["']/i) ||
                     prompt.match(/generate\s+(?:voice|audio|voiceover)\s+(.+)/i);
    const text = textMatch ? textMatch[1].trim() : 'Hello, this is a voiceover.';
    
    return [
      {
        type: 'generate_voiceover',
        text,
      } as Action,
    ];
  }

  // Default: return empty actions with a hint
  return [];
}

export async function mockGenerateVideo(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = '16:9'
): Promise<{ jobId: string; url?: string }> {
  await delay(500);
  
  const jobId = `job-video-${Date.now()}`;
  
  // Use demo asset if available, otherwise generate a placeholder URL
  const demoVideo = demoAssets.find((a) => a.type === 'video');
  const url = demoVideo?.url || `https://via.placeholder.com/1920x1080.webm?text=${encodeURIComponent(prompt)}`;
  
  return { jobId, url };
}

export async function mockGenerateImage(
  prompt: string,
  aspectRatio: string = '16:9'
): Promise<{ jobId: string; url?: string }> {
  await delay(500);
  
  const jobId = `job-image-${Date.now()}`;
  
  // Use demo asset if available, otherwise generate a placeholder URL
  const demoImage = demoAssets.find((a) => a.type === 'image');
  const url = demoImage?.url || `https://via.placeholder.com/1920x1080.png?text=${encodeURIComponent(prompt)}`;
  
  return { jobId, url };
}

export async function mockGenerateVoiceover(
  text: string,
  voice?: string
): Promise<{ jobId: string; url?: string }> {
  await delay(500);
  
  const jobId = `job-voiceover-${Date.now()}`;
  
  // Use demo asset if available, otherwise generate a placeholder URL
  const demoAudio = demoAssets.find((a) => a.type === 'audio' || a.type === 'voiceover');
  const url = demoAudio?.url || `https://via.placeholder.com/audio.mp3?text=${encodeURIComponent(text)}`;
  
  return { jobId, url };
}

// Mock SSE stream for job progress
export function createMockSSEStream(
  jobId: string,
  onEvent: (event: { type: string; data: unknown }) => void
): () => void {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    if (progress < 100) {
      onEvent({
        type: 'progress',
        data: { progress, status: 'processing' },
      });
    } else {
      onEvent({
        type: 'complete',
        data: { progress: 100, status: 'complete' },
      });
      clearInterval(interval);
    }
  }, 200);

  return () => clearInterval(interval);
}
