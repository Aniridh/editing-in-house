import { z } from 'zod';

// Job Status
export const JobStatusSchema = z.enum(['queued', 'generating', 'complete', 'error']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// Job
export const JobSchema = z.object({
  id: z.string(),
  status: JobStatusSchema,
  progress: z.number().min(0).max(100),
  url: z.string().url().optional(),
  error: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Job = z.infer<typeof JobSchema>;

// Action Types
export const GenerateClipActionSchema = z.object({
  type: z.literal('generate_clip'),
  prompt: z.string(),
  duration_sec: z.number().positive().optional(),
  aspect: z.string().optional(),
  style: z.string().optional(),
});

export const GenerateImageActionSchema = z.object({
  type: z.literal('generate_image'),
  prompt: z.string(),
  aspect: z.string().optional(),
  style: z.string().optional(),
});

export const GenerateVoiceoverActionSchema = z.object({
  type: z.literal('generate_voiceover'),
  text: z.string(),
  voice: z.string().optional(),
});

export const InsertActionSchema = z.object({
  type: z.literal('insert'),
  asset_id: z.string(),
  track: z.enum(['video', 'overlay', 'audio']),
  at: z.number().nonnegative(),
});

export const TrimActionSchema = z.object({
  type: z.literal('trim'),
  clip_id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

export const SplitActionSchema = z.object({
  type: z.literal('split'),
  clip_id: z.string(),
  at: z.number().nonnegative(),
});

export const MoveActionSchema = z.object({
  type: z.literal('move'),
  clip_id: z.string(),
  to: z.number().nonnegative(),
});

export const DeleteActionSchema = z.object({
  type: z.literal('delete'),
  clip_id: z.string(),
});

export const SetAspectActionSchema = z.object({
  type: z.literal('set_aspect'),
  aspect: z.string(),
});

export const SetCaptionActionSchema = z.object({
  type: z.literal('set_caption'),
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  track: z.enum(['overlay']).optional(),
});

export const SetMusicActionSchema = z.object({
  type: z.literal('set_music'),
  url: z.string().url().optional(),
  volume: z.number().optional(),
});

export const RenderActionSchema = z.object({
  type: z.literal('render'),
  format: z.string().optional(),
});

export const ClarifyActionSchema = z.object({
  type: z.literal('clarify'),
  params: z.object({
    question: z.string(),
  }),
});

// Union of all actions
export const ActionSchema = z.discriminatedUnion('type', [
  GenerateClipActionSchema,
  GenerateImageActionSchema,
  GenerateVoiceoverActionSchema,
  InsertActionSchema,
  TrimActionSchema,
  SplitActionSchema,
  MoveActionSchema,
  DeleteActionSchema,
  SetAspectActionSchema,
  SetCaptionActionSchema,
  SetMusicActionSchema,
  RenderActionSchema,
  ClarifyActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

// Interpret Request/Response
export const InterpretRequestSchema = z.object({
  text: z.string().min(1),
});

export const InterpretResponseSchema = z.object({
  actions: z.array(ActionSchema),
});

export type InterpretRequest = z.infer<typeof InterpretRequestSchema>;
export type InterpretResponse = z.infer<typeof InterpretResponseSchema>;

// Generation Request Schemas
export const GenerateVideoRequestSchema = z.object({
  prompt: z.string().min(1),
  duration_sec: z.number().positive().max(30).optional(),
  aspect: z.string().optional(),
  style: z.string().optional(),
});

export const GenerateImageRequestSchema = z.object({
  prompt: z.string().min(1),
  aspect: z.string().optional(),
  style: z.string().optional(),
});

export const GenerateVoiceRequestSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
});

export type GenerateVideoRequest = z.infer<typeof GenerateVideoRequestSchema>;
export type GenerateImageRequest = z.infer<typeof GenerateImageRequestSchema>;
export type GenerateVoiceRequest = z.infer<typeof GenerateVoiceRequestSchema>;

// Generation Response
export const GenerateResponseSchema = z.object({
  jobId: z.string().optional(),
  url: z.string().url().optional(),
});

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

