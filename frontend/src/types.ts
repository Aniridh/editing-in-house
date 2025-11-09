export type EditorActionType =
  | "generate_clip" | "generate_image" | "generate_voiceover"
  | "insert" | "move" | "trim" | "split" | "delete"
  | "set_aspect" | "set_caption" | "set_music" | "render";

export interface EditorAction {
  action: EditorActionType;
  params?: Record<string, any>;
}

export interface InterpretResponse {
  actions: EditorAction[];
}

export type AssetKind = "video" | "image" | "audio";

export interface Asset {
  id: string;
  kind: AssetKind;
  url: string;
  thumb?: string;
  meta?: any;
}

export type ClipType = "video" | "image" | "audio" | "caption";

export interface Clip {
  id: string;
  assetId?: string;
  type: ClipType;
  track: "video" | "audio" | "overlay";
  start: number;
  end: number;
  in?: number;
  out?: number;
  volume_db?: number;
  /* caption fields */
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  color?: string;
  bg?: string | null;
  opacity?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
}

export type JobStatus = "queued" | "generating" | "complete" | "error";

export interface Job {
  id: string;
  kind: "video" | "image" | "voice";
  status: JobStatus;
  progress?: number;
  url?: string;
  error?: string;
}

