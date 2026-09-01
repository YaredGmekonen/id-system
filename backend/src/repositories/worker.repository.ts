import { db } from '../db/index.js';
import type { Worker } from '../types/index.js';

export class WorkerRepository {
  async findAll(orgId: string): Promise<Worker[]> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", name, email, role, avatar,
        status, location, shift_start_time as "shiftStartTime", last_active as "lastActive",
        records_collected as "recordsCollected", battery_level as "batteryLevel",
        signal_strength as "signalStrength", assigned_district as "assignedDistrict",
        phone, created_at as "createdAt", updated_at as "updatedAt"
      FROM workers
      WHERE organization_id = $1
      ORDER BY id ASC
    `;
    const res = await db.query<Worker>(sql, [orgId]);
    return res.rows;
  }

  async findById(orgId: string, id: number): Promise<Worker | null> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", name, email, role, avatar,
        status, location, shift_start_time as "shiftStartTime", last_active as "lastActive",
        records_collected as "recordsCollected", battery_level as "batteryLevel",
        signal_strength as "signalStrength", assigned_district as "assignedDistrict",
        phone, created_at as "createdAt", updated_at as "updatedAt"
      FROM workers
      WHERE organization_id = $1 AND id = $2
    `;
    const res = await db.query<Worker>(sql, [orgId, id]);
    return res.rows[0] || null;
  }

  async updateTelemetry(
    orgId: string,
    id: number,
    changes: { status?: string; location?: string; batteryLevel?: number; signalStrength?: string; recordsCollected?: number }
  ): Promise<Worker | null> {
    const fields: string[] = [];
    const params: any[] = [orgId, id];
    let paramIndex = 3;

    if (changes.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(changes.status);
    }
    if (changes.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      params.push(changes.location);
    }
    if (changes.batteryLevel !== undefined) {
      fields.push(`battery_level = $${paramIndex++}`);
      params.push(changes.batteryLevel);
    }
    if (changes.signalStrength !== undefined) {
      fields.push(`signal_strength = $${paramIndex++}`);
      params.push(changes.signalStrength);
    }
    if (changes.recordsCollected !== undefined) {
      fields.push(`records_collected = $${paramIndex++}`);
      params.push(changes.recordsCollected);
    }

    if (fields.length === 0) return this.findById(orgId, id);

    fields.push('last_active = $1', 'updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE workers SET last_active = 'Just now', ${fields.join(', ')} WHERE organization_id = $1 AND id = $2`;
    await db.query(sql, params);

    return this.findById(orgId, id);
  }
}

export const workerRepository = new WorkerRepository();
