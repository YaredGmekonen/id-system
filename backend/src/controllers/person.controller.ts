import type { Request, Response, NextFunction } from 'express';
import { personService } from '../services/person.service.js';

export class PersonController {
  async getPersons(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const result = await personService.getPersons(orgId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getPersonById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const person = await personService.getPersonById(orgId, id);
      res.json({ success: true, data: person });
    } catch (err) {
      next(err);
    }
  }

  async createPerson(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const person = await personService.createPerson(orgId, req.body);
      res.status(201).json({ success: true, data: person });
    } catch (err) {
      next(err);
    }
  }

  async bulkCreatePersons(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const { persons, batchFolderId } = req.body;
      const result = await personService.bulkCreatePersons(orgId, persons, batchFolderId);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async updatePerson(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      const updated = await personService.updatePerson(orgId, id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deletePerson(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const id = parseInt(req.params.id, 10);
      await personService.deletePerson(orgId, id);
      res.json({ success: true, message: `Person ${id} deleted successfully` });
    } catch (err) {
      next(err);
    }
  }

  async bulkDeletePersons(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.authContext!.organizationId;
      const { ids } = req.body;
      const result = await personService.bulkDeletePersons(orgId, ids);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const personController = new PersonController();
