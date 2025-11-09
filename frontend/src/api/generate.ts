import { json } from "./client";
import type { Job } from "../types";

export interface GenerateVideoParams {
  prompt: string;
  duration_sec: number;
  aspect: string;
  style?: string;
}

export interface GenerateImageParams {
  prompt: string;
  aspect: string;
  style?: string;
}

export interface GenerateVoiceParams {
  text: string;
  voice?: string;
}

export async function generateVideo(
  params: GenerateVideoParams
): Promise<{ jobId: string }> {
  return json<{ jobId: string }>("/api/generate/video", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function generateImage(
  params: GenerateImageParams
): Promise<{ url: string } | { jobId: string }> {
  return json<{ url: string } | { jobId: string }>("/api/generate/image", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function generateVoice(
  params: GenerateVoiceParams
): Promise<{ url: string } | { jobId: string }> {
  return json<{ url: string } | { jobId: string }>("/api/generate/voice", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface JobStatusResponse {
  id: string;
  status: "queued" | "generating" | "complete" | "error";
  progress?: number;
  resultUrl?: string;
  error?: string;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return json<JobStatusResponse>(`/api/jobs/${jobId}`);
}

export function streamJob(
  jobId: string,
  handlers: {
    onEvent?: (event: string, data: any) => void;
    onError?: (err: Error) => void;
    onDone?: () => void;
  }
): () => void {
  let es: EventSource | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectDelay = 1000;
  let maxDelay = 8000;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  let usePolling = false;

  const cleanup = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (es) {
      es.close();
      es = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  // Polling fallback
  let pollInterval: NodeJS.Timeout | null = null;
  const startPolling = () => {
    usePolling = true;
    cleanup(); // Clean up SSE if it was running

    pollInterval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        handlers.onEvent?.("status", { status: status.status });
        if (status.progress !== undefined) {
          handlers.onEvent?.("progress", { progress: status.progress });
        }
        if (status.status === "complete" && status.resultUrl) {
          handlers.onEvent?.("complete", { url: status.resultUrl });
          handlers.onDone?.();
          if (pollInterval) clearInterval(pollInterval);
          pollInterval = null;
        } else if (status.status === "error") {
          handlers.onEvent?.("error", { message: status.error || "Unknown error" });
          handlers.onDone?.();
          if (pollInterval) clearInterval(pollInterval);
          pollInterval = null;
        }
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 1500); // Poll every 1.5s
  };

  const connect = () => {
    if (usePolling) return;

    const BASE = import.meta.env.VITE_API_URL ?? "";
    const url = `${BASE}/api/jobs/${jobId}/stream`;
    es = new EventSource(url);

    es.onopen = () => {
      reconnectAttempts = 0; // Reset on successful connection
    };

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onEvent?.(parsed.event, parsed.data);
        if (parsed.event === "complete" || parsed.event === "error") {
          handlers.onDone?.();
          cleanup();
        }
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    es.onerror = () => {
      es?.close();
      es = null;
      reconnectAttempts++;

      // Fall back to polling after max reconnect attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.warn(`SSE failed after ${maxReconnectAttempts} attempts, falling back to polling`);
        startPolling();
        return;
      }

      // Jittered exponential backoff
      const jitter = Math.random() * 0.3;
      reconnectDelay = Math.min(maxDelay, reconnectDelay * 2 * (1 + jitter));
      reconnectTimeout = setTimeout(connect, reconnectDelay);
    };
  };

  // Try SSE first, with fallback to polling
  try {
    connect();
  } catch (err) {
    console.warn("SSE connection failed, using polling fallback:", err);
    startPolling();
  }

  return cleanup;
}
