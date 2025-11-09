import express, { Express } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupMiddleware, errorHandler } from './middleware/index.js';
import apiRoutes from './routes/api.js';
import { logger } from './lib/logger.js';
import { register } from './lib/metrics.js';
import { reloadJobsFromPersistence, closePersistence } from './lib/jobs.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Reload jobs from persistence on boot (if enabled)
reloadJobsFromPersistence();

// Security headers with helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Hide X-Powered-By header (helmet does this, but ensure it's disabled)
app.disable('x-powered-by');

// Body parsing with size limit (1MB) - returns 413 on exceed
app.use(express.json({ limit: '1mb' }));

// Serve static demo assets from /public with 1 hour cache
const publicPath = join(__dirname, '..', 'public');
app.use('/public', express.static(publicPath, { maxAge: '1h' }));

// Setup middleware (CORS, logging, rate limiting, etc.)
setupMiddleware(app);

// Health check (at root level, not under /api)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error({ error }, 'Error generating metrics');
    res.status(500).end();
  }
});

// API routes
app.use('/api', apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('Server stopped accepting new connections');
  });
  
  // Import connection tracker
  const { closeAllConnections, getConnectionCount } = await import('./lib/connections.js');
  
  // Close all active SSE connections
  const connectionCount = getConnectionCount();
  if (connectionCount > 0) {
    logger.info({ count: connectionCount }, 'Closing active SSE connections');
    closeAllConnections();
  }
  
  // Give connections time to close (max 10 seconds)
  const shutdownTimeout = setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    closePersistence();
    process.exit(0);
  }, 10000);
  
  // Wait for active connections to close
  // Since we just closed them, check immediately
  if (connectionCount === 0) {
    clearTimeout(shutdownTimeout);
    closePersistence();
    logger.info('Server closed gracefully');
    process.exit(0);
  } else {
    // Check every second if connections are closed
    const checkInterval = setInterval(() => {
      if (getConnectionCount() === 0) {
        clearInterval(checkInterval);
        clearTimeout(shutdownTimeout);
        closePersistence();
        logger.info('Server closed gracefully');
        process.exit(0);
      }
    }, 1000);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

