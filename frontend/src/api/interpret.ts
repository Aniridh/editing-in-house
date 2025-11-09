import { apiPost } from './client';
import type { InterpretResponse, Action } from '../types';

export async function interpretCommand(
  prompt: string,
  demoMode: boolean
): Promise<Action[]> {
  if (demoMode) {
    // In demo mode, use mock API
    const { mockInterpret } = await import('./mockApi');
    return mockInterpret(prompt);
  }

  const response = await apiPost<InterpretResponse>('/api/interpret', { prompt });
  return response.actions;
}
