import { z } from 'zod';

export const createPersonSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  idNumber: z.string().min(1, 'ID number is required').max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  category: z.string().default('Employees'),
  department: z.string().default('General Operations'),
  role: z.string().default('Staff Member'),
  phone: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  bloodGroup: z.string().default('O+'),
  joinedDate: z.string().default(''),
  gender: z.string().optional(),
  schoolName: z.string().optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  guardianName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  photoDataUrl: z.string().optional(),
  photoUrl: z.string().optional(),
  status: z.enum(['Active', 'Pending', 'Printed', 'Processing']).default('Pending'),
  fulfillmentStatus: z.enum(['Fulfilled', 'Unfulfilled', 'Processing', 'Refunded', 'On Hold']).optional(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Refunded']).optional(),
  channel: z.string().optional(),
  batchFolderId: z.number().int().positive().optional(),
  workerId: z.number().int().positive().optional(),
  folderName: z.string().optional(),
  sourceFileName: z.string().optional(),
  archiveMeta: z
    .object({
      bookName: z.string().optional(),
      pageNumber: z.number().optional(),
      slotIndex: z.number().optional(),
      rawCropUrl: z.string().optional(),
    })
    .optional(),
  customFields: z.record(z.any()).optional(),
});

export const updatePersonSchema = createPersonSchema.partial();

export const bulkCreatePersonsSchema = z.object({
  batchFolderId: z.number().int().positive().optional(),
  persons: z.array(createPersonSchema).min(1, 'At least one person is required'),
});

export const personQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  search: z.string().optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  batchFolderId: z.coerce.number().int().positive().optional(),
  workerId: z.coerce.number().int().positive().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  cursor: z.string().optional(),
});
