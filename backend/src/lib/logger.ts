import pino from 'pino';

// Sensitive headers to redact (auth headers stripped from logs)
const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'cookie', 'x-auth-token', 'api-key'];

// Redact sensitive data from objects
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };
  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.some((h) => lowerKey.includes(h))) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => {
      const headers = redactSensitive((req.headers || {}) as Record<string, unknown>);
      return {
        method: req.method,
        url: req.url,
        headers,
        remoteAddress: req.remoteAddress,
      };
    },
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Helper to create child logger with request ID
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// Helper to log with latency
export function logWithLatency(
  logFn: (obj: Record<string, unknown>) => void,
  startTime: number,
  additionalData: Record<string, unknown> = {}
) {
  const latency = Date.now() - startTime;
  logFn({
    ...additionalData,
    latency: `${latency}ms`,
  });
}

