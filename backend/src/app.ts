import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authPlaceholder } from './middleware/authPlaceholder.js';
import apiV1Routes from './routes/index.js';

export function createApp() {
  const app = express();

  // Security & Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl) or matching configured origins
        if (!origin || env.CORS_ORIGIN.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-user-role', 'x-user-id'],
    })
  );

  // Body parsers (Support large batch JSON rosters & base64 images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Middleware pipeline
  app.use(requestLogger);
  app.use(authPlaceholder);

  // Root welcome & info
  app.get('/', (_req, res) => {
    res.json({
      name: 'SiliconLabs Enterprise ID Card Platform API',
      version: '1.0.0',
      status: 'online',
      docs: '/api/v1/health',
    });
  });

  // Mount API v1
  app.use('/api/v1', apiV1Routes);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        statusCode: 404,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
