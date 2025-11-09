import { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';
import { requestIdMiddleware } from './requestId.js';
import { errorHandler } from './errorHandler.js';
import { metricsMiddleware } from './metrics.js';

// CORS configuration - uses ALLOW_ORIGIN env var (comma-separated)
function getCorsOrigin(): string | string[] {
  const origin = process.env.ALLOW_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173';
  if (origin.includes(',')) {
    return origin.split(',').map((o) => o.trim());
  }
  return origin;
}

// Rate limiting
const interpretRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: 'Too many interpretation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429, // Explicitly set 429 status
});

const generateRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429, // Explicitly set 429 status
});

export function setupMiddleware(app: Express) {
  // Request ID (must be first)
  app.use(requestIdMiddleware);

  // Metrics middleware (before logging to capture all requests)
  app.use(metricsMiddleware);

  // Structured logging with enhanced fields
  app.use(
    pinoHttp({
      logger,
      customSuccessMessage: (req, res) => {
        const duration = req.startTime ? Date.now() - req.startTime : 0;
        return `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
      },
      customErrorMessage: (req, res) => {
        const duration = req.startTime ? Date.now() - req.startTime : 0;
        return `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
      },
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customProps: (req, res) => {
        const duration = req.startTime ? Date.now() - req.startTime : 0;
        return {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: duration,
          'req.id': req.id || req.requestId,
        };
      },
    })
  );

  // CORS
  app.use(
    cors({
      origin: getCorsOrigin(),
      credentials: true,
    })
  );

  // Body parsing with size limit (1MB) - express.json() is already available via Express
  // Note: express.json() middleware is typically added separately, but we'll handle it in the main app

  // Apply rate limiting to specific routes (will be applied in routes)
  app.locals.interpretRateLimit = interpretRateLimit;
  app.locals.generateRateLimit = generateRateLimit;

  // Request timeout (30s for generation endpoints, applied in routes)
}

export { interpretRateLimit, generateRateLimit, errorHandler };

