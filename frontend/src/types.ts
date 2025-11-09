// Backend-compatible types
export type JobStatus = 'queued' | 'generating' | 'complete' | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  url?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Action types matching backend
export interface GenerateClipAction {
  type: 'generate_clip';
  prompt: string;
  duration_sec?: number;
  aspect?: string;
  style?: string;
}

export interface GenerateImageAction {
  type: 'generate_image';
  prompt: string;
  aspect?: string;
  style?: string;
}

export interface GenerateVoiceoverAction {
  type: 'generate_voiceover';
  text: string;
  voice?: string;
}

export interface InsertAction {
  type: 'insert';
  asset_id: string;
  track: 'video' | 'overlay' | 'audio';
  at: number;
}

export interface TrimAction {
  type: 'trim';
  clip_id: string;
  start: number;
  end: number;
}

export interface SplitAction {
  type: 'split';
  clip_id: string;
  at: number;
}

export interface MoveAction {
  type: 'move';
  clip_id: string;
  to: number;
}

export interface DeleteAction {
  type: 'delete';
  clip_id: string;
}

export interface SetAspectAction {
  type: 'set_aspect';
  aspect: string;
}

export interface SetCaptionAction {
  type: 'set_caption';
  text: string;
  start: number;
  end: number;
  track?: 'overlay';
}

export interface SetMusicAction {
  type: 'set_music';
  url?: string;
  volume?: number;
}

export interface RenderAction {
  type: 'render';
  format?: string;
}

export type Action =
  | GenerateClipAction
  | GenerateImageAction
  | GenerateVoiceoverAction
  | InsertAction
  | TrimAction
  | SplitAction
  | MoveAction
  | DeleteAction
  | SetAspectAction
  | SetCaptionAction
  | SetMusicAction
  | RenderAction;

export interface InterpretResponse {
  actions: Action[];
}

export interface GenerateResponse {
  jobId?: string;
  url?: string;
}

// Frontend-specific types
export type AssetType = 'video' | 'image' | 'audio' | 'voiceover';

export interface Asset {
  id: string;
  url: string;
  type: AssetType;
  duration?: number; // in seconds
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: string;
    thumbnails?: string[]; // Array of data URLs for video thumbnails
    waveform?: number[]; // Array of normalized amplitude values (0-1) for audio waveform
    [key: string]: unknown;
  };
  createdAt: number;
}

export interface Clip {
  id: string;
  assetId?: string; // Optional for caption clips
  trackId: string;
  start: number; // timeline position in seconds
  end: number; // timeline position in seconds
  inPoint: number; // start time within asset (seconds)
  outPoint: number; // end time within asset (seconds)
  // Caption/overlay properties (only for caption clips)
  type?: 'caption';
  text?: string;
  x?: number; // position in pixels or percentage
  y?: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bg?: string; // background color
  opacity?: number; // 0-1
  fadeInMs?: number;
  fadeOutMs?: number;
  // Transition properties
  transitionType?: 'crossfade';
  transitionDuration?: number; // in seconds (0.25-1.5)
  transitionToClipId?: string; // ID of clip this transitions to
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips: Clip[];
  locked?: boolean;
  muted?: boolean;
}

