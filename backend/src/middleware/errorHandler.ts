import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createRequestLogger, logWithLatency } from '../lib/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');

  // Body size limit exceeded (413)
  if ((err as any).type === 'entity.too.large' || err.message.includes('limit')) {
    logWithLatency(
      (data) => requestLogger.warn(data, 'Payload too large'),
      req.startTime || Date.now(),
      { error: 'Request body exceeds 1MB limit' }
    );
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request body exceeds 1MB limit',
      requestId: req.requestId,
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    logWithLatency(
      (data) => requestLogger.warn(data, 'Validation error'),
      req.startTime || Date.now(),
      { errors: err.errors }
    );
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
      requestId: req.requestId,
    });
  }

  // Other errors
  logWithLatency(
    (data) => requestLogger.error(data, 'Request error'),
    req.startTime || Date.now(),
    { error: err.message, stack: err.stack }
  );

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    requestId: req.requestId,
  });
}

