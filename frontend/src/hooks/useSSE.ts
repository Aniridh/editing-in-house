import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { Job } from '../types';

interface SSEEvent {
  type: 'status' | 'progress' | 'complete' | 'error';
  data: {
    status?: Job['status'];
    progress?: number;
    url?: string;
    error?: string;
  };
}
import { createMockSSEStream } from '../api/mockApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Jittered backoff: returns delay between 1-8 seconds
function getJitteredBackoff(attempt: number): number {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 8000); // Cap at 8s
  const jitter = Math.random() * 1000; // 0-1s jitter
  return baseDelay + jitter;
}

export function useSSE(jobId: string | null, demoMode: boolean = false) {
  const updateJob = useEditorStore((state) => state.updateJob);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mockCleanupRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef<number>(0);
  const lastEventRef = useRef<{ progress?: number; status?: Job['status'] } | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!jobId) return;

    // Reset cancellation flag when job changes
    isCancelledRef.current = false;
    retryAttemptRef.current = 0;

    if (demoMode) {
      // Use mock SSE stream
      const cleanup = createMockSSEStream(jobId, (event) => {
        if (event.type === 'progress') {
          const data = event.data as { progress: number; status: string };
          lastEventRef.current = { progress: data.progress, status: data.status as Job['status'] };
          updateJob({
            id: jobId,
            status: (data.status || 'generating') as Job['status'],
            progress: data.progress,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } else if (event.type === 'complete') {
          // Get the job to preserve the URL
          const store = useEditorStore.getState();
          const job = store.jobs.get(jobId);
          lastEventRef.current = { progress: 100, status: 'complete' };
          updateJob({
            id: jobId,
            status: 'complete',
            progress: 100,
            url: job?.url,
            createdAt: job?.createdAt || Date.now(),
            updatedAt: Date.now(),
          });
        }
      });
      mockCleanupRef.current = cleanup;
      return cleanup;
    }

    // Real SSE connection with retry logic
    const connectSSE = async () => {
      if (isCancelledRef.current) return;

      // Resume from last event if available
      if (lastEventRef.current && retryAttemptRef.current > 0) {
        const store = useEditorStore.getState();
        const job = store.jobs.get(jobId);
        if (job) {
          // Restore last known state
          updateJob({
            id: jobId,
            status: lastEventRef.current.status || job.status,
            progress: lastEventRef.current.progress || job.progress,
            createdAt: job.createdAt,
            updatedAt: Date.now(),
          });
        }
      }

      const url = `${API_BASE_URL}/api/jobs/${jobId}/stream`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        // Reset retry attempt on successful connection
        retryAttemptRef.current = 0;
        console.log(`SSE connected for job ${jobId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          
          if (sseEvent.type === 'status' || sseEvent.type === 'progress') {
            const store = useEditorStore.getState();
            const job = store.jobs.get(jobId);
            const status = (sseEvent.data.status || job?.status || 'generating') as Job['status'];
            const progress = sseEvent.data.progress ?? job?.progress ?? 0;
            
            // Store last event for resume
            lastEventRef.current = { progress, status };
            
            updateJob({
              id: jobId,
              status,
              progress,
              createdAt: job?.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
          } else if (sseEvent.type === 'complete') {
            const store = useEditorStore.getState();
            const job = store.jobs.get(jobId);
            lastEventRef.current = { progress: 100, status: 'complete' };
            updateJob({
              id: jobId,
              status: 'complete',
              progress: 100,
              url: sseEvent.data.url || job?.url,
              createdAt: job?.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
            eventSource.close();
          } else if (sseEvent.type === 'error') {
            const store = useEditorStore.getState();
            const job = store.jobs.get(jobId);
            updateJob({
              id: jobId,
              status: 'error' as Job['status'],
              progress: job?.progress || 0,
              error: sseEvent.data.error || 'Unknown error',
              createdAt: job?.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
            eventSource.close();
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = async (error) => {
        console.error('SSE error:', error);
        
        // Check if job was cancelled
        if (isCancelledRef.current) {
          eventSource.close();
          return;
        }

        // Check if connection closed
        if (eventSource.readyState === EventSource.CLOSED) {
          // Check job status - if complete or error, don't retry
          const store = useEditorStore.getState();
          const job = store.jobs.get(jobId);
          if (job && (job.status === 'complete' || job.status === 'error')) {
            // Job is terminal, close connection and stop retrying
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            return;
          }

          // Schedule retry with jittered backoff
          retryAttemptRef.current += 1;
          const backoffDelay = getJitteredBackoff(retryAttemptRef.current - 1);
          
          console.log(`SSE connection lost for job ${jobId}, retrying in ${backoffDelay}ms (attempt ${retryAttemptRef.current})`);
          
          retryTimeoutRef.current = setTimeout(() => {
            eventSource.close();
            connectSSE();
          }, backoffDelay);
        }
      };

      eventSourceRef.current = eventSource;
    };

    connectSSE();

    return () => {
      isCancelledRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [jobId, demoMode, updateJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (mockCleanupRef.current) {
        mockCleanupRef.current();
      }
    };
  }, []);
}
