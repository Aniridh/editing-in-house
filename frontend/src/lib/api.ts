import type { InterpretResponse, GenerateResponse, Job } from '../types.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithError(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(errorMessage, response.status, response);
  }

  return response;
}

// Interpret natural language command
export async function interpret(text: string): Promise<InterpretResponse> {
  const response = await fetchWithError(`${API_BASE_URL}/api/interpret`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return response.json();
}

// Generate video
export async function generateVideo(params: {
  prompt: string;
  duration_sec?: number;
  aspect?: string;
  style?: string;
}): Promise<GenerateResponse> {
  const response = await fetchWithError(`${API_BASE_URL}/api/generate/video`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response.json();
}

// Generate image
export async function generateImage(params: {
  prompt: string;
  aspect?: string;
  style?: string;
}): Promise<GenerateResponse> {
  const response = await fetchWithError(`${API_BASE_URL}/api/generate/image`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response.json();
}

// Generate voice
export async function generateVoice(params: {
  text: string;
  voice?: string;
}): Promise<GenerateResponse> {
  const response = await fetchWithError(`${API_BASE_URL}/api/generate/voice`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response.json();
}

// Stream job progress via SSE
export function streamJob(
  jobId: string,
  callbacks: {
    onStatus?: (status: Job['status']) => void;
    onProgress?: (progress: number) => void;
    onComplete?: (url: string) => void;
    onError?: (error: string) => void;
  }
): () => void {
  const eventSource = new EventSource(`${API_BASE_URL}/api/jobs/${jobId}/stream`);

  eventSource.addEventListener('status', (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onStatus?.(data.status);
    } catch (error) {
      console.error('Error parsing status event:', error);
    }
  });

  eventSource.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onProgress?.(data.progress);
    } catch (error) {
      console.error('Error parsing progress event:', error);
    }
  });

  eventSource.addEventListener('complete', (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onComplete?.(data.url);
      eventSource.close();
    } catch (error) {
      console.error('Error parsing complete event:', error);
    }
  });

  eventSource.addEventListener('error', (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onError?.(data.error || 'Unknown error');
      eventSource.close();
    } catch (error) {
      console.error('Error parsing error event:', error);
    }
  });

  eventSource.onerror = () => {
    callbacks.onError?.('Connection error');
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

