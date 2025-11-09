import type { Asset, Action } from '../types';

// Canned demo assets
export const demoAssets: Asset[] = [
  {
    id: 'demo-video-1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video',
    duration: 60,
    metadata: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    },
    createdAt: Date.now() - 10000,
  },
  {
    id: 'demo-video-2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'video',
    duration: 30,
    metadata: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    },
    createdAt: Date.now() - 8000,
  },
  {
    id: 'demo-image-1',
    url: 'https://picsum.photos/1920/1080',
    type: 'image',
    metadata: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    },
    createdAt: Date.now() - 6000,
  },
  {
    id: 'demo-audio-1',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    type: 'audio',
    duration: 120,
    metadata: {},
    createdAt: Date.now() - 4000,
  },
];

// Canned action sequences for demo mode
export const demoActionSequences: Action[][] = [
  [
    {
      type: 'generate_clip',
      params: {
        prompt: 'a sunset over the ocean',
        duration: 5,
        aspectRatio: '16:9',
      },
    },
    {
      type: 'generate_voiceover',
      params: {
        text: 'Welcome to the AI video editor. This is a demo of generated content.',
      },
    },
  ],
  [
    {
      type: 'generate_image',
      params: {
        prompt: 'a futuristic cityscape',
        aspectRatio: '16:9',
      },
    },
  ],
];
