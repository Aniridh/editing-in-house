// In-memory idempotency store
// Maps idempotency keys to their results
interface IdempotencyResult {
  status: 'pending' | 'complete';
  resultUrl?: string;
  jobId?: string;
}

const idempotencyStore = new Map<string, IdempotencyResult>();

export function getIdempotencyResult(key: string): IdempotencyResult | null {
  return idempotencyStore.get(key) || null;
}

export function setIdempotencyResult(
  key: string,
  result: IdempotencyResult
): void {
  idempotencyStore.set(key, result);
}

// Cleanup old idempotency keys (optional, for memory management)
export function cleanupIdempotencyKeys(maxAge: number = 86400000): number {
  // For now, we'll keep all keys indefinitely
  // In production, you might want to track timestamps and clean up old keys
  return 0;
}

