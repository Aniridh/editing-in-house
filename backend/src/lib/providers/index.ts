// Import all providers statically
import { demoProvider } from './demo.js';
import { pikaProvider } from './pika.js';
import { runwayProvider } from './runway.js';

export type GenKind = 'video' | 'image' | 'voice';

export interface GenJobInput {
  kind: GenKind;
  prompt?: string;
  duration_sec?: number;
  aspect?: '16:9' | '9:16' | '1:1';
  style?: string;
  text?: string; // for voiceover
  voice?: string; // for voiceover voice selection
}

export interface Provider {
  name: string;
  createJob(input: GenJobInput): Promise<{ jobId: string } | { url: string }>;
  streamJob?(jobId: string, send: (ev: string, data: any) => void): Promise<void>;
}

export function getProvider(kind: GenKind): Provider {
  const map = {
    video: process.env.PROVIDER_VIDEO ?? 'demo',
    image: process.env.PROVIDER_IMAGE ?? 'demo',
    voice: process.env.PROVIDER_VOICE ?? 'demo',
  };

  const name = map[kind];

  if (name === 'demo') return demoProvider;
  if (name === 'pika') return pikaProvider;
  if (name === 'runway') return runwayProvider;

  // Default to demo
  return demoProvider;
}

