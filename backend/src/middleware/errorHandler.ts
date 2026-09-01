import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : 'Internal Server Error';
  const details = isAppError ? err.details : undefined;

  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    details,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details,
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}
