import { db } from '../db/index.js';
import type { BatchFolder, PaginatedResult } from '../types/index.js';
import { normalizePagination, buildPaginatedResult } from '../utils/pagination.js';

export class BatchRepository {
  async findPaginated(
    orgId: string,
    filters: { page?: number; limit?: number; status?: string; sourceType?: string; search?: string }
  ): Promise<PaginatedResult<BatchFolder>> {
    const { page, limit, offset } = normalizePagination(filters);
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.sourceType) {
      conditions.push(`source_type = $${paramIndex++}`);
      params.push(filters.sourceType);
    }

    if (filters.search) {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${filters.search.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM batch_folders WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT 
        id, organization_id as "organizationId", name, source_type as "sourceType",
        status, collector_name as "collectorName", total_records as "totalRecords",
        assigned_designer as "assignedDesigner", notes, metadata,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM batch_folders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataRes = await db.query<BatchFolder>(dataSql, params);

    return buildPaginatedResult(dataRes.rows, total, page, limit);
  }

  async findById(orgId: string, id: number): Promise<BatchFolder | null> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", name, source_type as "sourceType",
        status, collector_name as "collectorName", total_records as "totalRecords",
        assigned_designer as "assignedDesigner", notes, metadata,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM batch_folders
      WHERE organization_id = $1 AND id = $2
    `;
    const res = await db.query<BatchFolder>(sql, [orgId, id]);
    return res.rows[0] || null;
  }

  async create(orgId: string, data: Partial<BatchFolder>): Promise<BatchFolder> {
    const sql = `
      INSERT INTO batch_folders (
        organization_id, name, source_type, status, collector_name,
        total_records, assigned_designer, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const res = await db.query(sql, [
      orgId,
      data.name,
      data.sourceType || 'Excel Import',
      data.status || 'Ready for Design',
      data.collectorName || 'System Admin',
      data.totalRecords || 0,
      data.assignedDesigner || null,
      data.notes || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
    ]);
    return (await this.findById(orgId, res.rows[0].id))!;
  }

  async update(orgId: string, id: number, changes: Partial<BatchFolder>): Promise<BatchFolder | null> {
    const fields: string[] = [];
    const params: any[] = [orgId, id];
    let paramIndex = 3;

    if (changes.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(changes.name);
    }
    if (changes.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(changes.status);
    }
    if (changes.totalRecords !== undefined) {
      fields.push(`total_records = $${paramIndex++}`);
      params.push(changes.totalRecords);
    }
    if (changes.assignedDesigner !== undefined) {
      fields.push(`assigned_designer = $${paramIndex++}`);
      params.push(changes.assignedDesigner);
    }
    if (changes.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      params.push(changes.notes);
    }

    if (fields.length === 0) return this.findById(orgId, id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE batch_folders SET ${fields.join(', ')} WHERE organization_id = $1 AND id = $2`;
    await db.query(sql, params);

    return this.findById(orgId, id);
  }

  async delete(orgId: string, id: number): Promise<boolean> {
    const res = await db.query(
      'DELETE FROM batch_folders WHERE organization_id = $1 AND id = $2',
      [orgId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const batchRepository = new BatchRepository();
