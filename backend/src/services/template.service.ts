import { templateRepository } from '../repositories/template.repository.js';
import type { CardTemplate, TemplateVersion, PaginatedResult } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

export class TemplateService {
  async getTemplates(
    orgId: string,
    filters: { page?: number; limit?: number; category?: string }
  ): Promise<PaginatedResult<CardTemplate>> {
    return templateRepository.findPaginated(orgId, filters);
  }

  async getTemplateById(orgId: string, id: number): Promise<CardTemplate> {
    const template = await templateRepository.findById(orgId, id);
    if (!template) throw new NotFoundError('CardTemplate', id);
    return template;
  }

  async createTemplate(orgId: string, data: Partial<CardTemplate>): Promise<CardTemplate> {
    return templateRepository.create(orgId, data);
  }

  async updateTemplate(orgId: string, id: number, changes: Partial<CardTemplate>): Promise<CardTemplate> {
    const updated = await templateRepository.update(orgId, id, changes);
    if (!updated) throw new NotFoundError('CardTemplate', id);
    return updated;
  }

  async getTemplateVersions(templateId: number): Promise<TemplateVersion[]> {
    return templateRepository.findVersions(templateId);
  }

  async deleteTemplate(orgId: string, id: number): Promise<void> {
    const deleted = await templateRepository.delete(orgId, id);
    if (!deleted) throw new NotFoundError('CardTemplate', id);
  }
}

export const templateService = new TemplateService();
