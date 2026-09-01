import { apiClient } from '../api/client';
import { db, type CardTemplate } from '../db/database';

export class TemplateService {
  async getTemplates(): Promise<CardTemplate[]> {
    try {
      const res = await apiClient.get<CardTemplate[]>('templates');
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Offline fallback
    }
    return db.templates.toArray();
  }

  async addTemplate(template: Omit<CardTemplate, 'id'>): Promise<number> {
    try {
      const res = await apiClient.post<CardTemplate>('templates', template);
      if (res.success && res.data?.id) {
        await db.templates.put({ ...template, id: res.data.id } as CardTemplate);
        return res.data.id;
      }
    } catch {
      // Offline fallback
    }
    return (await db.templates.add(template as CardTemplate)) as number;
  }

  async updateTemplate(id: number, changes: Partial<CardTemplate>): Promise<void> {
    try {
      await apiClient.put(`templates/${id}`, changes);
    } catch {
      // Offline fallback
    }
    await (db.templates as any).update(id, { ...changes, updatedAt: new Date() });
  }

  async deleteTemplate(id: number): Promise<void> {
    try {
      await apiClient.delete(`templates/${id}`);
    } catch {
      // Offline fallback
    }
    await db.templates.delete(id);
  }
}

export const templateService = new TemplateService();
