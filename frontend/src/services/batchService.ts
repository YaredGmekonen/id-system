import { apiClient } from '../api/client';
import { db, type BatchFolder } from '../db/database';

export class BatchService {
  async getBatches(): Promise<BatchFolder[]> {
    try {
      const res = await apiClient.get<BatchFolder[]>('batches');
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Offline fallback
    }
    return db.batchFolders.toArray();
  }

  async addBatch(batch: Omit<BatchFolder, 'id'>): Promise<number> {
    try {
      const res = await apiClient.post<BatchFolder>('batches', batch);
      if (res.success && res.data?.id) {
        await db.batchFolders.put({ ...batch, id: res.data.id } as BatchFolder);
        return res.data.id;
      }
    } catch {
      // Offline fallback
    }
    return (await db.batchFolders.add(batch as BatchFolder)) as number;
  }

  async updateBatch(id: number, changes: Partial<BatchFolder>): Promise<void> {
    try {
      await apiClient.put(`batches/${id}`, changes);
    } catch {
      // Offline fallback
    }
    await db.batchFolders.update(id, { ...changes, updatedAt: new Date() });
  }

  async deleteBatch(id: number): Promise<void> {
    try {
      await apiClient.delete(`batches/${id}`);
    } catch {
      // Offline fallback
    }
    await db.batchFolders.delete(id);
  }
}

export const batchService = new BatchService();
