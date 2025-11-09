import Database from 'better-sqlite3';
import { Job, JobStatus } from '../types.js';
import { logger } from './logger.js';

let db: Database.Database | null = null;

export interface PersistedJob {
  id: string;
  kind: string | null;
  status: JobStatus;
  progress: number;
  url: string | null;
  error: string | null;
  createdAt: number;
}

/**
 * Initialize SQLite database and create jobs table
 */
export function initPersistence(dbPath: string = './jobs.db'): void {
  try {
    db = new Database(dbPath);
    
    // Create jobs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        kind TEXT,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        url TEXT,
        error TEXT,
        createdAt INTEGER NOT NULL
      )
    `);
    
    // Create index on status for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)
    `);
    
    logger.info({ dbPath }, 'SQLite persistence initialized');
  } catch (error) {
    logger.error({ error, dbPath }, 'Failed to initialize SQLite persistence');
    throw error;
  }
}

/**
 * Save a job to the database
 */
export function saveJob(job: Job, kind?: string): void {
  if (!db) return;
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO jobs (id, kind, status, progress, url, error, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      job.id,
      kind || null,
      job.status,
      job.progress,
      job.url || null,
      job.error || null,
      job.createdAt
    );
  } catch (error) {
    logger.error({ error, jobId: job.id }, 'Failed to save job to database');
  }
}

/**
 * Update a job in the database
 */
export function updateJobInDb(
  id: string,
  updates: Partial<Pick<Job, 'status' | 'progress' | 'url' | 'error'>>
): void {
  if (!db) return;
  
  try {
    const job = getJobFromDb(id);
    if (!job) {
      // Job doesn't exist in DB, might be new - try to save it
      return;
    }
    
    const updated: PersistedJob = {
      ...job,
      ...updates,
    };
    
    const stmt = db.prepare(`
      UPDATE jobs 
      SET status = ?, progress = ?, url = ?, error = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updated.status,
      updated.progress,
      updated.url || null,
      updated.error || null,
      id
    );
  } catch (error) {
    logger.error({ error, jobId: id }, 'Failed to update job in database');
  }
}

/**
 * Get a job from the database
 */
export function getJobFromDb(id: string): PersistedJob | null {
  if (!db) return null;
  
  try {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as PersistedJob | undefined;
    return row || null;
  } catch (error) {
    logger.error({ error, jobId: id }, 'Failed to get job from database');
    return null;
  }
}

/**
 * Get all jobs from the database
 */
export function getAllJobsFromDb(): PersistedJob[] {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC');
    return stmt.all() as PersistedJob[];
  } catch (error) {
    logger.error({ error }, 'Failed to get all jobs from database');
    return [];
  }
}

/**
 * Get all non-terminal jobs (queued or generating)
 */
export function getNonTerminalJobs(): PersistedJob[] {
  if (!db) return [];
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM jobs 
      WHERE status IN ('queued', 'generating')
      ORDER BY createdAt DESC
    `);
    return stmt.all() as PersistedJob[];
  } catch (error) {
    logger.error({ error }, 'Failed to get non-terminal jobs from database');
    return [];
  }
}

/**
 * Mark non-terminal jobs as error with "server_restarted"
 */
export function markNonTerminalJobsAsRestarted(): number {
  if (!db) return 0;
  
  try {
    const stmt = db.prepare(`
      UPDATE jobs 
      SET status = 'error', error = 'server_restarted'
      WHERE status IN ('queued', 'generating')
    `);
    const result = stmt.run();
    return result.changes;
  } catch (error) {
    logger.error({ error }, 'Failed to mark non-terminal jobs as restarted');
    return 0;
  }
}

/**
 * Close the database connection
 */
export function closePersistence(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite persistence closed');
  }
}

