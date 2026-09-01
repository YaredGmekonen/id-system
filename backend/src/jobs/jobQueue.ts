import { jobRepository } from '../repositories/job.repository.js';
import type { GenerationJob } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class JobQueue {
  /**
   * Claim next queued job atomically using database locking
   */
  async claimNext(): Promise<GenerationJob | null> {
    return jobRepository.claimNextQueuedJob();
  }

  /**
   * Update progress for an active job
   */
  async updateProgress(jobId: string, processed: number, total: number): Promise<void> {
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
    await jobRepository.updateJobProgress(jobId, processed, percent);
    logger.debug(`Job ${jobId} progress: ${processed}/${total} (${percent}%)`);
  }

  /**
   * Mark job as completed with artifacts
   */
  async complete(jobId: string, outputZipPath?: string, outputPdfPath?: string): Promise<void> {
    await jobRepository.completeJob(jobId, outputZipPath, outputPdfPath);
    logger.info(`Job ${jobId} marked as COMPLETED`);
  }

  /**
   * Mark job as failed with error details
   */
  async fail(jobId: string, error: Error | string): Promise<void> {
    const message = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
    await jobRepository.failJob(jobId, message);
    logger.error(`Job ${jobId} marked as FAILED`, { error: message });
  }
}

export const jobQueue = new JobQueue();
