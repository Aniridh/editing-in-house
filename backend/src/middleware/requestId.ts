import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include requestId and id
declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  req.id = requestId;
  req.requestId = requestId;
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', requestId);
  next();
}

