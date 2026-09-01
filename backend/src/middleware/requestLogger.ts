import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  req.headers['x-request-id'] = requestId;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;

    const logFn =
      statusCode >= 500
        ? logger.error
        : statusCode >= 400
        ? logger.warn
        : logger.info;

    logFn(`${req.method} ${req.originalUrl} - ${statusCode} (${durationMs}ms)`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      durationMs,
      ip: req.ip,
    });
  });

  next();
}
