import { apiClient } from '../api/client';

export interface GenerationJobPayload {
  batchFolderId?: number;
  templateId: number;
  templateVersionId?: string;
  options?: {
    includeBack?: boolean;
    batchSizeLimit?: number;
    chunkSize?: number;
    highResDpi?: number;
  };
}

export class JobService {
  /**
   * Dispatch a generation job into the backend background queue
   */
  async dispatchGenerationJob(payload: GenerationJobPayload) {
    return apiClient.post('jobs/generation', payload);
  }

  /**
   * Poll generation job status
   */
  async getJobStatus(jobId: string) {
    return apiClient.get(`jobs/generation/${jobId}`);
  }

  /**
   * Cancel generation job
   */
  async cancelJob(jobId: string) {
    return apiClient.post(`jobs/generation/${jobId}/cancel`);
  }
}

export const jobService = new JobService();
