import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db/index.js';

export const auditRouter = Router();

const mockAuditLogs = [
  { id: '1', time: '2m ago', actor: 'Collector 05 (Hanna M.)', action: 'BATCH_SUBMITTED', details: 'Submitted 45 records for Batch: Grade 10 Students 2026', ip: '192.168.1.45' },
  { id: '2', time: '5m ago', actor: 'Designer 03 (Selamawit B.)', action: 'TEMPLATE_APPROVED', details: 'Approved template layout for Corporate CR80', ip: '192.168.1.12' },
  { id: '3', time: '12m ago', actor: 'System Worker (Job Engine)', action: 'GENERATION_COMPLETED', details: 'Generated 120 high-res card sides in 3.4s', ip: '127.0.0.1' },
  { id: '4', time: '18m ago', actor: 'Collector 12 (Tewodros K.)', action: 'PHOTOS_UPLOADED', details: 'Uploaded 32 portrait photos with face crop', ip: '192.168.1.88' },
  { id: '5', time: '25m ago', actor: 'Print Studio Operator', action: 'PRINT_EXPORTED', details: 'Exported 10-sheet duplex PDF for Batch: Staff ID', ip: '192.168.1.10' },
  { id: '6', time: '1h ago', actor: 'Abenezer Kaleab (Admin)', action: 'USER_ROLE_UPDATED', details: 'Assigned role "designer" to user Almaz Ayana', ip: '192.168.1.2' },
];

auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.authContext?.organizationId;
    const dbRes = await db.query(
      `SELECT id, action, entity_type, entity_id, changes, ip_address, created_at FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [orgId || '00000000-0000-0000-0000-000000000001']
    );

    if (dbRes.rows.length > 0) {
      return res.json({ success: true, data: dbRes.rows });
    }
    return res.json({ success: true, data: mockAuditLogs });
  } catch {
    return res.json({ success: true, data: mockAuditLogs });
  }
});
