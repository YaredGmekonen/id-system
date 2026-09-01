import { z } from 'zod';

export const createGenerationJobSchema = z.object({
  batchFolderId: z.number().int().positive().optional(),
  templateId: z.number().int().positive(),
  templateVersionId: z.string().uuid().optional(),
  options: z
    .object({
      includeBack: z.boolean().default(true),
      batchSizeLimit: z.number().int().min(10).max(50000).default(10000),
      chunkSize: z.number().int().min(10).max(1000).default(250),
      highResDpi: z.number().int().default(300),
    })
    .default({}),
});

export const createPrintJobSchema = z.object({
  batchFolderId: z.number().int().positive().optional(),
  layoutType: z.enum(['8-up', '10-up', '1-up', 'custom']).default('8-up'),
  paperSize: z.enum(['A4', 'A3', 'Letter', 'Custom']).default('A4'),
  totalSheets: z.number().int().positive().default(1),
});
