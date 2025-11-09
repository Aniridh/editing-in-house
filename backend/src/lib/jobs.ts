import { v4 as uuidv4 } from 'uuid';
import { Job, JobSchema, JobStatus } from '../types.js';
import {
  initPersistence,
  saveJob,
  updateJobInDb,
  getJobFromDb,
  getAllJobsFromDb,
  getNonTerminalJobs,
  markNonTerminalJobsAsRestarted,
  closePersistence,
  type PersistedJob,
} from './persistence.js';
import { logger } from './logger.js';

// In-memory job store
const jobs = new Map<string, Job>();
// Track job kind for persistence
const jobKinds = new Map<string, string>();

// Check if persistence is enabled
const PERSIST_JOBS = process.env.PERSIST_JOBS === '1';

// Convert PersistedJob to Job
function persistedJobToJob(persisted: PersistedJob): Job {
  return {
    id: persisted.id,
    status: persisted.status,
    progress: persisted.progress,
    url: persisted.url || undefined,
    error: persisted.error || undefined,
    createdAt: persisted.createdAt,
    updatedAt: persisted.createdAt, // Use createdAt as updatedAt for reloaded jobs
  };
}

// Initialize persistence if enabled
if (PERSIST_JOBS) {
  try {
    initPersistence();
    logger.info('Job persistence enabled');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize job persistence, continuing without it');
  }
}

export function createJob(initialStatus: JobStatus = 'queued', kind?: string): string {
  const id = uuidv4();
  const now = Date.now();
  const job: Job = {
    id,
    status: initialStatus,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);
  
  // Track kind for persistence
  if (kind) {
    jobKinds.set(id, kind);
  }
  
  // Persist if enabled
  if (PERSIST_JOBS) {
    saveJob(job, kind);
  }
  
  return id;
}

export function updateJob(
  id: string,
  updates: Partial<Pick<Job, 'status' | 'progress' | 'url' | 'error'>>
): Job | null {
  const job = jobs.get(id);
  if (!job) {
    // Try to load from persistence if enabled
    if (PERSIST_JOBS) {
      const persisted = getJobFromDb(id);
      if (persisted) {
        const loadedJob = persistedJobToJob(persisted);
        jobs.set(id, loadedJob);
        if (persisted.kind) {
          jobKinds.set(id, persisted.kind);
        }
        // Continue with update
        const updated: Job = {
          ...loadedJob,
          ...updates,
          updatedAt: Date.now(),
        };
        const validated = JobSchema.parse(updated);
        jobs.set(id, validated);
        updateJobInDb(id, updates);
        return validated;
      }
    }
    return null;
  }

  const updated: Job = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  // Validate the updated job
  const validated = JobSchema.parse(updated);
  jobs.set(id, validated);
  
  // Persist if enabled
  if (PERSIST_JOBS) {
    updateJobInDb(id, updates);
  }
  
  return validated;
}

export function getJob(id: string): Job | null {
  // Check in-memory first
  const job = jobs.get(id);
  if (job) {
    return job;
  }
  
  // Try to load from persistence if enabled
  if (PERSIST_JOBS) {
    const persisted = getJobFromDb(id);
    if (persisted) {
      const loadedJob = persistedJobToJob(persisted);
      jobs.set(id, loadedJob);
      if (persisted.kind) {
        jobKinds.set(id, persisted.kind);
      }
      return loadedJob;
    }
  }
  
  return null;
}

export function getAllJobs(): Job[] {
  // If persistence is enabled, merge in-memory and persisted jobs
  if (PERSIST_JOBS) {
    const persistedJobs = getAllJobsFromDb();
    const allJobs = new Map<string, Job>(jobs);
    
    for (const persisted of persistedJobs) {
      if (!allJobs.has(persisted.id)) {
        allJobs.set(persisted.id, persistedJobToJob(persisted));
        if (persisted.kind) {
          jobKinds.set(persisted.id, persisted.kind);
        }
      }
    }
    
    return Array.from(allJobs.values());
  }
  
  return Array.from(jobs.values());
}

export function cancelJob(id: string): Job | null {
  const job = jobs.get(id);
  if (!job) {
    return null;
  }

  // Only cancel if job is still in progress
  if (job.status === 'queued' || job.status === 'generating') {
    return updateJob(id, {
      status: 'error',
      error: 'cancelled',
    });
  }

  // Job already completed or errored, return as-is
  return job;
}

/**
 * Reload jobs from persistence and mark non-terminal jobs as restarted
 * Call this on server boot if persistence is enabled
 */
export function reloadJobsFromPersistence(): void {
  if (!PERSIST_JOBS) return;
  
  try {
    // Mark non-terminal jobs as restarted in DB first
    const marked = markNonTerminalJobsAsRestarted();
    logger.info({ count: marked }, 'Marked non-terminal jobs as server_restarted');
    
    // Reload all jobs into memory
    const persistedJobs = getAllJobsFromDb();
    for (const persisted of persistedJobs) {
      const job = persistedJobToJob(persisted);
      
      // If it was marked as restarted (status is now error with server_restarted)
      if (persisted.status === 'error' && persisted.error === 'server_restarted') {
        job.status = 'error';
        job.error = 'server_restarted';
        job.updatedAt = Date.now();
      }
      
      jobs.set(job.id, job);
      if (persisted.kind) {
        jobKinds.set(job.id, persisted.kind);
      }
    }
    
    logger.info({ count: persistedJobs.length }, 'Reloaded jobs from persistence');
  } catch (error) {
    logger.error({ error }, 'Failed to reload jobs from persistence');
  }
}

// Cleanup old completed/error jobs (optional, for memory management)
export function cleanupOldJobs(maxAge: number = 3600000): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, job] of jobs.entries()) {
    if (
      (job.status === 'complete' || job.status === 'error') &&
      now - job.updatedAt > maxAge
    ) {
      jobs.delete(id);
      jobKinds.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

// Export close function for graceful shutdown
export { closePersistence };

