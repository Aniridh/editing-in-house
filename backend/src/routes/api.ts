import { Router, Request, Response } from 'express';
import { interpret } from '../lib/interpret.js';
import { getProvider } from '../lib/providers/index.js';
import { getJob, cancelJob, updateJob } from '../lib/jobs.js';
import { getIdempotencyResult, setIdempotencyResult } from '../lib/idempotency.js';
import {
  InterpretRequestSchema,
  GenerateVideoRequestSchema,
  GenerateImageRequestSchema,
  GenerateVoiceRequestSchema,
} from '../types.js';
import { interpretRateLimit, generateRateLimit } from '../middleware/index.js';
import { createRequestLogger, logWithLatency } from '../lib/logger.js';
import { genLatency } from '../lib/metrics.js';
import { createJobWithRetry } from '../lib/retry.js';

const router = Router();

// POST /api/interpret
router.post('/interpret', interpretRateLimit, async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const startTime = req.startTime || Date.now();

  try {
    const body = InterpretRequestSchema.parse(req.body);
    const result = await interpret(body.text);
    
    logWithLatency(
      (data) => requestLogger.info(data, 'Interpretation completed'),
      startTime,
      { actionCount: result.actions.length }
    );

    res.json(result);
  } catch (error) {
    logWithLatency(
      (data) => requestLogger.error(data, 'Interpretation failed'),
      startTime,
      { error: error instanceof Error ? error.message : String(error) }
    );
    // Return empty actions on error (as per spec)
    res.json({ actions: [] });
  }
});

// POST /api/generate/video
router.post('/generate/video', generateRateLimit, async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const startTime = req.startTime || Date.now();

  try {
    // Check for idempotency key
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const cached = getIdempotencyResult(idempotencyKey);
      if (cached) {
        // Return cached result
        const response: { jobId?: string; url?: string } = {};
        if (cached.jobId) response.jobId = cached.jobId;
        if (cached.resultUrl) response.url = cached.resultUrl;
        
        logWithLatency(
          (data) => requestLogger.info(data, 'Video generation (idempotent)'),
          startTime,
          { idempotencyKey, ...response }
        );
        
        return res.json(response);
      }
    }

    const body = GenerateVideoRequestSchema.parse(req.body);
    const provider = getProvider('video');
    
    // Track provider call duration
    const genStartTime = Date.now();
    let result: { jobId: string } | { url: string } | null = null;
    
    try {
      result = await createJobWithRetry(provider, {
        kind: 'video',
        prompt: body.prompt,
        duration_sec: body.duration_sec,
        aspect: body.aspect as '16:9' | '9:16' | '1:1' | undefined,
        style: body.style,
      }, {
        maxAttempts: 3,
        initialDelay: 300,
        timeout: 10000, // 10 seconds per attempt (3 attempts + backoff = ~25-35s total)
      });
      
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'video' }, genDuration);
    } catch (error) {
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'video' }, genDuration);
      
      // If we got a jobId before timeout, mark it as error
      if (result && 'jobId' in result) {
        updateJob(result.jobId, {
          status: 'error',
          error: error instanceof Error && error.message.includes('timeout')
            ? 'timeout'
            : error instanceof Error ? error.message : 'Provider call failed',
        });
      }
      
      // Re-throw with timeout error message if it was a timeout
      const errorMessage = error instanceof Error && error.message.includes('timeout')
        ? 'timeout'
        : error instanceof Error ? error.message : 'Provider call failed';
      
      logWithLatency(
        (data) => requestLogger.error(data, 'Video generation failed after retries'),
        startTime,
        { error: errorMessage, provider: provider.name }
      );
      
      res.status(500).json({ error: errorMessage });
      return;
    }
    
    // Store idempotency result if key provided
    if (idempotencyKey) {
      setIdempotencyResult(idempotencyKey, {
        status: 'jobId' in result ? 'pending' : 'complete',
        jobId: 'jobId' in result ? result.jobId : undefined,
        resultUrl: 'url' in result ? result.url : undefined,
      });
    }
    
    logWithLatency(
      (data) => requestLogger.info(data, 'Video generation started'),
      startTime,
      { jobId: 'jobId' in result ? result.jobId : undefined, provider: provider.name, idempotencyKey }
    );

    res.json(result);
  } catch (error) {
    logWithLatency(
      (data) => requestLogger.error(data, 'Video generation request failed'),
      startTime,
      { error: error instanceof Error ? error.message : String(error) }
    );
    res.status(400).json({ error: 'Invalid request' });
  }
});

// POST /api/generate/image
router.post('/generate/image', generateRateLimit, async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const startTime = req.startTime || Date.now();

  try {
    // Check for idempotency key
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const cached = getIdempotencyResult(idempotencyKey);
      if (cached) {
        // Return cached result
        const response: { jobId?: string; url?: string } = {};
        if (cached.jobId) response.jobId = cached.jobId;
        if (cached.resultUrl) response.url = cached.resultUrl;
        
        logWithLatency(
          (data) => requestLogger.info(data, 'Image generation (idempotent)'),
          startTime,
          { idempotencyKey, ...response }
        );
        
        return res.json(response);
      }
    }

    const body = GenerateImageRequestSchema.parse(req.body);
    const provider = getProvider('image');
    
    // Track provider call duration
    const genStartTime = Date.now();
    let result: { jobId: string } | { url: string } | null = null;
    
    try {
      result = await createJobWithRetry(provider, {
        kind: 'image',
        prompt: body.prompt,
        aspect: body.aspect as '16:9' | '9:16' | '1:1' | undefined,
        style: body.style,
      }, {
        maxAttempts: 3,
        initialDelay: 300,
        timeout: 10000, // 10 seconds per attempt (3 attempts + backoff = ~25-35s total)
      });
      
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'image' }, genDuration);
    } catch (error) {
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'image' }, genDuration);
      
      // If we got a jobId before timeout, mark it as error
      if (result && 'jobId' in result) {
        updateJob(result.jobId, {
          status: 'error',
          error: error instanceof Error && error.message.includes('timeout')
            ? 'timeout'
            : error instanceof Error ? error.message : 'Provider call failed',
        });
      }
      
      // Re-throw with timeout error message if it was a timeout
      const errorMessage = error instanceof Error && error.message.includes('timeout')
        ? 'timeout'
        : error instanceof Error ? error.message : 'Provider call failed';
      
      logWithLatency(
        (data) => requestLogger.error(data, 'Image generation failed after retries'),
        startTime,
        { error: errorMessage, provider: provider.name }
      );
      
      res.status(500).json({ error: errorMessage });
      return;
    }
    
    // Store idempotency result if key provided
    if (idempotencyKey) {
      setIdempotencyResult(idempotencyKey, {
        status: 'jobId' in result ? 'pending' : 'complete',
        jobId: 'jobId' in result ? result.jobId : undefined,
        resultUrl: 'url' in result ? result.url : undefined,
      });
    }
    
    logWithLatency(
      (data) => requestLogger.info(data, 'Image generation completed'),
      startTime,
      { url: 'url' in result ? result.url : undefined, jobId: 'jobId' in result ? result.jobId : undefined, provider: provider.name, idempotencyKey }
    );

    res.json(result);
  } catch (error) {
    logWithLatency(
      (data) => requestLogger.error(data, 'Image generation request failed'),
      startTime,
      { error: error instanceof Error ? error.message : String(error) }
    );
    res.status(400).json({ error: 'Invalid request' });
  }
});

// POST /api/generate/voice
router.post('/generate/voice', generateRateLimit, async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const startTime = req.startTime || Date.now();

  try {
    // Check for idempotency key
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const cached = getIdempotencyResult(idempotencyKey);
      if (cached) {
        // Return cached result
        const response: { jobId?: string; url?: string } = {};
        if (cached.jobId) response.jobId = cached.jobId;
        if (cached.resultUrl) response.url = cached.resultUrl;
        
        logWithLatency(
          (data) => requestLogger.info(data, 'Voice generation (idempotent)'),
          startTime,
          { idempotencyKey, ...response }
        );
        
        return res.json(response);
      }
    }

    const body = GenerateVoiceRequestSchema.parse(req.body);
    const provider = getProvider('voice');
    
    // Track provider call duration
    const genStartTime = Date.now();
    let result: { jobId: string } | { url: string } | null = null;
    
    try {
      result = await createJobWithRetry(provider, {
        kind: 'voice',
        text: body.text,
        voice: body.voice,
      }, {
        maxAttempts: 3,
        initialDelay: 300,
        timeout: 10000, // 10 seconds per attempt (3 attempts + backoff = ~25-35s total)
      });
      
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'voice' }, genDuration);
    } catch (error) {
      const genDuration = Date.now() - genStartTime;
      genLatency.observe({ provider: provider.name, kind: 'voice' }, genDuration);
      
      // If we got a jobId before timeout, mark it as error
      if (result && 'jobId' in result) {
        updateJob(result.jobId, {
          status: 'error',
          error: error instanceof Error && error.message.includes('timeout')
            ? 'timeout'
            : error instanceof Error ? error.message : 'Provider call failed',
        });
      }
      
      // Re-throw with timeout error message if it was a timeout
      const errorMessage = error instanceof Error && error.message.includes('timeout')
        ? 'timeout'
        : error instanceof Error ? error.message : 'Provider call failed';
      
      logWithLatency(
        (data) => requestLogger.error(data, 'Voice generation failed after retries'),
        startTime,
        { error: errorMessage, provider: provider.name }
      );
      
      res.status(500).json({ error: errorMessage });
      return;
    }
    
    // Store idempotency result if key provided
    if (idempotencyKey) {
      setIdempotencyResult(idempotencyKey, {
        status: 'jobId' in result ? 'pending' : 'complete',
        jobId: 'jobId' in result ? result.jobId : undefined,
        resultUrl: 'url' in result ? result.url : undefined,
      });
    }
    
    logWithLatency(
      (data) => requestLogger.info(data, 'Voice generation completed'),
      startTime,
      { url: 'url' in result ? result.url : undefined, jobId: 'jobId' in result ? result.jobId : undefined, provider: provider.name, idempotencyKey }
    );

    res.json(result);
  } catch (error) {
    logWithLatency(
      (data) => requestLogger.error(data, 'Voice generation request failed'),
      startTime,
      { error: error instanceof Error ? error.message : String(error) }
    );
    res.status(400).json({ error: 'Invalid request' });
  }
});

// GET /api/jobs/:id
router.get('/jobs/:id', async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const jobId = req.params.id;

  const job = getJob(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  // Return job status in the requested format
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    resultUrl: job.url,
    error: job.error,
  });
});

// DELETE /api/jobs/:id
router.delete('/jobs/:id', async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const jobId = req.params.id;

  const job = getJob(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  // Cancel the job
  const cancelledJob = cancelJob(jobId);
  if (!cancelledJob) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  requestLogger.info({ jobId, status: cancelledJob.status }, 'Job cancelled');

  res.json({
    id: cancelledJob.id,
    status: cancelledJob.status,
    progress: cancelledJob.progress,
    resultUrl: cancelledJob.url,
    error: cancelledJob.error,
  });
});

// GET /api/jobs/:id/stream
router.get('/jobs/:id/stream', async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.requestId || 'unknown');
  const jobId = req.params.id;

  // Import connection tracker for graceful shutdown
  const { addConnection, removeConnection } = await import('../lib/connections.js');

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Track this connection for graceful shutdown
  addConnection(res);

  // Send initial status
  const job = getJob(jobId);
  if (!job) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
    res.end();
    removeConnection(res);
    return;
  }

  // Send current status
  res.write(`event: status\n`);
  res.write(`data: ${JSON.stringify({ status: job.status })}\n\n`);

  // Heartbeat interval - send heartbeat every 15 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${JSON.stringify({ t: Date.now() })}\n\n`);
  }, 15000); // Every 15 seconds

  // Poll for updates
  let lastProgress = job.progress;
  let lastStatus = job.status;
  const pollInterval = setInterval(() => {
    const currentJob = getJob(jobId);
    if (!currentJob) {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
      res.end();
      removeConnection(res);
      return;
    }

    // Send progress updates
    if (currentJob.progress !== lastProgress) {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({ progress: currentJob.progress })}\n\n`);
      lastProgress = currentJob.progress;
    }

    // Send status updates
    if (currentJob.status !== lastStatus) {
      res.write(`event: status\n`);
      res.write(`data: ${JSON.stringify({ status: currentJob.status })}\n\n`);
      lastStatus = currentJob.status;
    }

    // Send completion
    if (currentJob.status === 'complete' && currentJob.url) {
      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify({ url: currentJob.url })}\n\n`);
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      res.end();
      removeConnection(res);
      requestLogger.info({ jobId }, 'Job stream completed');
      return;
    }

    // Send error
    if (currentJob.status === 'error') {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: currentJob.error || 'Unknown error' })}\n\n`);
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      res.end();
      removeConnection(res);
      requestLogger.error({ jobId, error: currentJob.error }, 'Job stream error');
      return;
    }
  }, 500); // Poll every 500ms

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    clearInterval(heartbeatInterval);
    removeConnection(res);
    requestLogger.info({ jobId }, 'Job stream disconnected');
  });
});

export default router;

