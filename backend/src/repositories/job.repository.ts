import { db } from '../db/index.js';
import type { GenerationJob, PrintJob, JobStatus, PaginatedResult } from '../types/index.js';
import { normalizePagination, buildPaginatedResult } from '../utils/pagination.js';

export class JobRepository {
  /**
   * Create a new generation job in QUEUED status
   */
  async createGenerationJob(
    orgId: string,
    data: {
      batchFolderId?: number;
      templateId: number;
      templateVersionId?: string;
      totalRecords: number;
      options: Record<string, any>;
    }
  ): Promise<GenerationJob> {
    const sql = `
      INSERT INTO generation_jobs (
        organization_id, batch_folder_id, template_id, template_version_id,
        status, total_records, processed_records, progress_percent, options
      ) VALUES ($1, $2, $3, $4, 'QUEUED', $5, 0, 0, $6)
      RETURNING 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        template_id as "templateId", template_version_id as "templateVersionId",
        status, total_records as "totalRecords", processed_records as "processedRecords",
        progress_percent as "progressPercent", options, output_zip_path as "outputZipPath",
        output_pdf_path as "outputPdfPath", error_details as "errorDetails",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const res = await db.query<GenerationJob>(sql, [
      orgId,
      data.batchFolderId || null,
      data.templateId,
      data.templateVersionId || null,
      data.totalRecords,
      JSON.stringify(data.options),
    ]);

    return res.rows[0];
  }

  /**
   * Find generation job by ID
   */
  async findGenerationJobById(id: string): Promise<GenerationJob | null> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        template_id as "templateId", template_version_id as "templateVersionId",
        status, total_records as "totalRecords", processed_records as "processedRecords",
        progress_percent as "progressPercent", options, output_zip_path as "outputZipPath",
        output_pdf_path as "outputPdfPath", error_details as "errorDetails",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM generation_jobs
      WHERE id = $1
    `;
    const res = await db.query<GenerationJob>(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * List paginated generation jobs
   */
  async findGenerationJobsPaginated(
    orgId: string,
    filters: { page?: number; limit?: number; status?: string }
  ): Promise<PaginatedResult<GenerationJob>> {
    const { page, limit, offset } = normalizePagination(filters);
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM generation_jobs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        template_id as "templateId", template_version_id as "templateVersionId",
        status, total_records as "totalRecords", processed_records as "processedRecords",
        progress_percent as "progressPercent", options, output_zip_path as "outputZipPath",
        output_pdf_path as "outputPdfPath", error_details as "errorDetails",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM generation_jobs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataRes = await db.query<GenerationJob>(dataSql, params);

    return buildPaginatedResult(dataRes.rows, total, page, limit);
  }

  /**
   * Worker queue claim: Atomically locks and claims the next queued job
   */
  async claimNextQueuedJob(): Promise<GenerationJob | null> {
    const sql = `
      UPDATE generation_jobs
      SET status = 'PROCESSING', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM generation_jobs
        WHERE status = 'QUEUED'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        template_id as "templateId", template_version_id as "templateVersionId",
        status, total_records as "totalRecords", processed_records as "processedRecords",
        progress_percent as "progressPercent", options, output_zip_path as "outputZipPath",
        output_pdf_path as "outputPdfPath", error_details as "errorDetails",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await db.query<GenerationJob>(sql);
    return res.rows[0] || null;
  }

  /**
   * Update progress telemetry for a generation job
   */
  async updateJobProgress(
    jobId: string,
    processedRecords: number,
    progressPercent: number
  ): Promise<void> {
    await db.query(
      `UPDATE generation_jobs
       SET processed_records = $2, progress_percent = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId, processedRecords, progressPercent]
    );
  }

  /**
   * Mark generation job as completed
   */
  async completeJob(
    jobId: string,
    outputZipPath?: string,
    outputPdfPath?: string
  ): Promise<void> {
    await db.query(
      `UPDATE generation_jobs
       SET status = 'COMPLETED', progress_percent = 100,
           output_zip_path = $2, output_pdf_path = $3,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId, outputZipPath || null, outputPdfPath || null]
    );
  }

  /**
   * Mark generation job as failed
   */
  async failJob(jobId: string, errorDetails: string): Promise<void> {
    await db.query(
      `UPDATE generation_jobs
       SET status = 'FAILED', error_details = $2,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId, errorDetails]
    );
  }

  /**
   * Cancel a generation job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const res = await db.query(
      `UPDATE generation_jobs
       SET status = 'CANCELLED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('QUEUED', 'PROCESSING')`,
      [jobId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Create a print job
   */
  async createPrintJob(
    orgId: string,
    data: {
      batchFolderId?: number;
      layoutType: string;
      paperSize: string;
      totalSheets: number;
    }
  ): Promise<PrintJob> {
    const sql = `
      INSERT INTO print_jobs (
        organization_id, batch_folder_id, layout_type, paper_size, total_sheets, status
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        layout_type as "layoutType", paper_size as "paperSize", total_sheets as "totalSheets",
        status, pdf_path as "pdfPath", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await db.query<PrintJob>(sql, [
      orgId,
      data.batchFolderId || null,
      data.layoutType,
      data.paperSize,
      data.totalSheets,
    ]);
    return res.rows[0];
  }
}

export const jobRepository = new JobRepository();
