import { z } from 'zod';

export const canvasElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fill: z.string().optional(),
  src: z.string().optional(),
  dataField: z.string().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
}).passthrough();

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  category: z.string().optional(),
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  themeId: z.string().optional(),
  widthPx: z.number().int().positive().default(1012),
  heightPx: z.number().int().positive().default(638),
  widthMm: z.number().positive().default(85.6),
  heightMm: z.number().positive().default(54.0),
  backgroundColor: z.string().default('#FFFFFF'),
  backBackgroundColor: z.string().default('#F8FAFC'),
  isDefault: z.boolean().default(false),
  frontElements: z.array(canvasElementSchema).default([]),
  backElements: z.array(canvasElementSchema).default([]),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const createVersionSchema = z.object({
  frontElements: z.array(canvasElementSchema),
  backElements: z.array(canvasElementSchema),
  changeSummary: z.string().optional(),
});
