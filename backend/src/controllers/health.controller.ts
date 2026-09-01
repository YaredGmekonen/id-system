import type { Request, Response } from 'express';
import { db } from '../db/index.js';

export class HealthController {
  async getHealth(_req: Request, res: Response) {
    const dbHealthy = await db.ping();

    const status = dbHealthy ? 'healthy' : 'degraded';
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      service: 'siliconlabs-id-platform-backend',
      version: '1.0.0',
      checks: {
        database: dbHealthy ? 'connected' : 'disconnected',
        storage: 'ready',
        workerQueue: 'ready',
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  }
}

export const healthController = new HealthController();
