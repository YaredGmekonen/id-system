import type { Request, Response, NextFunction } from 'express';
import { generationService } from '../services/generation.service.js';

export class JobController {
  async dispatchGenerationJob(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const job = await generationService.dispatchJob(orgId, req.body);
      res.status(202).json({
        success: true,
        message: 'Generation job queued for background processing',
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  async getGenerationJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await generationService.getJobById(req.params.id);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  async getGenerationJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const result = await generationService.getJobs(orgId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async cancelGenerationJob(req: Request, res: Response, next: NextFunction) {
    try {
      await generationService.cancelJob(req.params.id);
      res.json({ success: true, message: `Job ${req.params.id} cancelled successfully` });
    } catch (err) {
      next(err);
    }
  }

  async createPrintJob(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const job = await generationService.createPrintJob(orgId, req.body);
      res.status(201).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }
}

export const jobController = new JobController();
