import { batchRepository } from '../repositories/batch.repository.js';
import type { BatchFolder, PaginatedResult } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

export class BatchService {
  async getBatches(
    orgId: string,
    filters: { page?: number; limit?: number; status?: string; sourceType?: string; search?: string }
  ): Promise<PaginatedResult<BatchFolder>> {
    return batchRepository.findPaginated(orgId, filters);
  }

  async getBatchById(orgId: string, id: number): Promise<BatchFolder> {
    const batch = await batchRepository.findById(orgId, id);
    if (!batch) throw new NotFoundError('BatchFolder', id);
    return batch;
  }

  async createBatch(orgId: string, data: Partial<BatchFolder>): Promise<BatchFolder> {
    return batchRepository.create(orgId, data);
  }

  async updateBatch(orgId: string, id: number, changes: Partial<BatchFolder>): Promise<BatchFolder> {
    const updated = await batchRepository.update(orgId, id, changes);
    if (!updated) throw new NotFoundError('BatchFolder', id);
    return updated;
  }

  async deleteBatch(orgId: string, id: number): Promise<void> {
    const deleted = await batchRepository.delete(orgId, id);
    if (!deleted) throw new NotFoundError('BatchFolder', id);
  }
}

export const batchService = new BatchService();
