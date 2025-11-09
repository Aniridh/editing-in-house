import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../lib/metrics.js';

// Extract route from path (e.g., /api/interpret -> /api/interpret)
function getRoute(path: string): string {
  // Normalize route paths
  if (path.startsWith('/api/')) {
    // Extract the route pattern
    if (path.startsWith('/api/generate/')) {
      return '/api/generate/*';
    }
    if (path.startsWith('/api/jobs/') && path.includes('/stream')) {
      return '/api/jobs/:id/stream';
    }
    if (path.startsWith('/api/jobs/')) {
      return '/api/jobs/:id';
    }
    return path.split('?')[0]; // Remove query params
  }
  return path.split('?')[0];
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const route = getRoute(req.path);
  const method = req.method;

  // Track request duration
  const durationTimer = httpRequestDuration.startTimer({ route, method });

  // Override res.end to capture status code
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    durationTimer();

    // Record metrics
    const status = res.statusCode.toString();
    httpRequestsTotal.inc({ route, status });

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

