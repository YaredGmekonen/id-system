import { jobRepository } from '../repositories/job.repository.js';
import { personRepository } from '../repositories/person.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import type { GenerationJob, PrintJob, PaginatedResult } from '../types/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class GenerationService {
  /**
   * Dispatch a generation job into the QUEUED state
   */
  async dispatchJob(
    orgId: string,
    params: {
      batchFolderId?: number;
      templateId: number;
      templateVersionId?: string;
      options?: Record<string, any>;
    }
  ): Promise<GenerationJob> {
    // Verify template exists
    const template = await templateRepository.findById(orgId, params.templateId);
    if (!template) throw new NotFoundError('CardTemplate', params.templateId);

    // Determine record count
    let totalRecords = 0;
    if (params.batchFolderId) {
      const persons = await personRepository.findByBatchFolderId(orgId, params.batchFolderId);
      totalRecords = persons.length;
    }

    if (totalRecords === 0) {
      // Fallback: get total org count if no specific batch folder
      const all = await personRepository.findPaginated(orgId, { limit: 1 });
      totalRecords = all.pagination.total;
    }

    if (totalRecords === 0) {
      throw new ValidationError('Cannot dispatch generation job on empty dataset (0 records found)');
    }

    return jobRepository.createGenerationJob(orgId, {
      batchFolderId: params.batchFolderId,
      templateId: params.templateId,
      templateVersionId: params.templateVersionId || template.currentVersionId || undefined,
      totalRecords,
      options: params.options || {
        includeBack: true,
        batchSizeLimit: 10000,
        chunkSize: 250,
        highResDpi: 300,
      },
    });
  }

  async getJobById(id: string): Promise<GenerationJob> {
    const job = await jobRepository.findGenerationJobById(id);
    if (!job) throw new NotFoundError('GenerationJob', id);
    return job;
  }

  async getJobs(
    orgId: string,
    filters: { page?: number; limit?: number; status?: string }
  ): Promise<PaginatedResult<GenerationJob>> {
    return jobRepository.findGenerationJobsPaginated(orgId, filters);
  }

  async cancelJob(id: string): Promise<void> {
    const cancelled = await jobRepository.cancelJob(id);
    if (!cancelled) throw new ValidationError(`Job ${id} cannot be cancelled (already completed or not found)`);
  }

  async createPrintJob(
    orgId: string,
    data: {
      batchFolderId?: number;
      layoutType: string;
      paperSize: string;
      totalSheets: number;
    }
  ): Promise<PrintJob> {
    return jobRepository.createPrintJob(orgId, data);
  }
}

export const generationService = new GenerationService();
