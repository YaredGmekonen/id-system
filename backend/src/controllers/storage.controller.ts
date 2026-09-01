import type { Request, Response, NextFunction } from 'express';
import { storageService } from '../storage/storageService.js';
import { ValidationError } from '../utils/errors.js';

export class StorageController {
  async uploadPersonPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const { personId, photoDataUrl, filename } = req.body;

      if (!personId) throw new ValidationError('personId is required');
      if (!photoDataUrl && !req.file) throw new ValidationError('No photo payload or file provided');

      const data = req.file ? req.file.buffer : photoDataUrl;
      const originalName = req.file ? req.file.originalname : filename || 'photo.jpg';

      const result = await storageService.savePersonPhoto(orgId, personId, data, originalName);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const key = decodeURIComponent(req.params[0] || req.params.key);
      const buffer = await storageService.getFile(key);

      // Guess Content-Type from extension
      const ext = key.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        pdf: 'application/pdf',
        zip: 'application/zip',
        json: 'application/json',
      };
      const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const storageController = new StorageController();
