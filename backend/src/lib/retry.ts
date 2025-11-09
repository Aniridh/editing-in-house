import { logger } from './logger.js';
import type { Provider, GenJobInput } from './providers/index.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 300,
  maxDelay: 1200,
  timeout: 10000, // 10 seconds per attempt (3 attempts + backoff = ~25-35s total)
};

/**
 * Retry a provider call with exponential backoff and timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const delays = [
    opts.initialDelay,
    opts.initialDelay * 2,
    opts.initialDelay * 4,
  ].slice(0, opts.maxAttempts);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, opts.timeout);
      });

      // Race the function against the timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, throw
      if (attempt === opts.maxAttempts - 1) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      const delay = delays[attempt];
      logger.warn(
        {
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
          delay,
          error: lastError.message,
        },
        'Provider call failed, retrying'
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error');
}

/**
 * Wrapper for provider.createJob with retry and timeout
 */
export async function createJobWithRetry(
  provider: Provider,
  input: GenJobInput,
  options: RetryOptions = {}
): Promise<{ jobId: string } | { url: string }> {
  return retryWithTimeout(
    () => provider.createJob(input),
    options
  );
}

