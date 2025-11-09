import { Response } from 'express';

// Track active SSE connections for graceful shutdown
export const activeConnections = new Set<Response>();

/**
 * Add a connection to the tracking set
 */
export function addConnection(res: Response): void {
  activeConnections.add(res);
}

/**
 * Remove a connection from the tracking set
 */
export function removeConnection(res: Response): void {
  activeConnections.delete(res);
}

/**
 * Get count of active connections
 */
export function getConnectionCount(): number {
  return activeConnections.size;
}

/**
 * Close all active connections
 */
export function closeAllConnections(): void {
  activeConnections.forEach((res) => {
    try {
      res.write(`event: shutdown\n`);
      res.write(`data: ${JSON.stringify({ message: 'Server shutting down' })}\n\n`);
      res.end();
    } catch (error) {
      // Connection may already be closed
    }
  });
  activeConnections.clear();
}

