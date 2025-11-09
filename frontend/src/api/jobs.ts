import { apiGet, apiPost } from './client';
import type { Job } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function cancelJob(jobId: string): Promise<Job> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    progress: data.progress || 0,
    url: data.resultUrl,
    error: data.error,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function getJob(jobId: string): Promise<Job> {
  const data = await apiGet<{
    id: string;
    status: string;
    progress?: number;
    resultUrl?: string;
    error?: string;
  }>(`/api/jobs/${jobId}`);

  return {
    id: data.id,
    status: data.status as Job['status'],
    progress: data.progress || 0,
    url: data.resultUrl,
    error: data.error,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
