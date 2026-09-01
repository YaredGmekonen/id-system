import type { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service.js';

export class TemplateController {
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const result = await templateService.getTemplates(orgId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const template = await templateService.getTemplateById(orgId, id);
      res.json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const template = await templateService.createTemplate(orgId, req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const updated = await templateService.updateTemplate(orgId, id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getTemplateVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const versions = await templateService.getTemplateVersions(id);
      res.json({ success: true, data: versions });
    } catch (err) {
      next(err);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      await templateService.deleteTemplate(orgId, id);
      res.json({ success: true, message: `Template ${id} deleted successfully` });
    } catch (err) {
      next(err);
    }
  }
}

export const templateController = new TemplateController();
