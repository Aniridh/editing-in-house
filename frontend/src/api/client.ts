import type { InterpretResponse, GenerateResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetchWithError(`${API_BASE_URL}${endpoint}`);
  return response.json();
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}
