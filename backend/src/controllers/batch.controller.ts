import type { Request, Response, NextFunction } from 'express';
import { batchService } from '../services/batch.service.js';

export class BatchController {
  async getBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const result = await batchService.getBatches(orgId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const batch = await batchService.getBatchById(orgId, id);
      res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const batch = await batchService.createBatch(orgId, req.body);
      res.status(201).json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async updateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const updated = await batchService.updateBatch(orgId, id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      await batchService.deleteBatch(orgId, id);
      res.json({ success: true, message: `Batch ${id} deleted successfully` });
    } catch (err) {
      next(err);
    }
  }
}

export const batchController = new BatchController();
