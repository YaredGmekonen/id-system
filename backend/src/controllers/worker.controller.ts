import type { Request, Response, NextFunction } from 'express';
import { workerRepository } from '../repositories/worker.repository.js';
import { NotFoundError } from '../utils/errors.js';

export class WorkerController {
  async getWorkers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const workers = await workerRepository.findAll(orgId);
      res.json({ success: true, data: workers });
    } catch (err) {
      next(err);
    }
  }

  async getWorkerById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const worker = await workerRepository.findById(orgId, id);
      if (!worker) throw new NotFoundError('Worker', id);
      res.json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkerTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const updated = await workerRepository.updateTelemetry(orgId, id, req.body);
      if (!updated) throw new NotFoundError('Worker', id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const workerController = new WorkerController();
