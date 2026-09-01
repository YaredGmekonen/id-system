import { z } from 'zod';

export const createBatchSchema = z.object({
  name: z.string().min(1, 'Batch name is required').max(255),
  sourceType: z.enum(['Excel Import', 'Manual Intake', 'Archive Digitizer', 'Paper Document OCR']),
  status: z.enum(['Ready for Design', 'In Design', 'Approved', 'Printed', 'Archived']).default('Ready for Design'),
  collectorName: z.string().default('System Admin'),
  totalRecords: z.number().int().nonnegative().default(0),
  assignedDesigner: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateBatchSchema = createBatchSchema.partial();

export const batchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
  sourceType: z.string().optional(),
  search: z.string().optional(),
});
