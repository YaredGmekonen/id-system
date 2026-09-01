import type { PaginationParams, PaginatedResult } from '../types/index.js';

export function normalizePagination(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
} {
  const page = Math.max(1, parseInt(String(params.page || 1), 10));
  const limit = Math.min(1000, Math.max(1, parseInt(String(params.limit || 50), 10)));
  const offset = (page - 1) * limit;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return { page, limit, offset, sortBy, sortOrder };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function encodeCursor(cursorObj: Record<string, any>): string {
  return Buffer.from(JSON.stringify(cursorObj)).toString('base64url');
}

export function decodeCursor<T = Record<string, any>>(cursorStr?: string): T | null {
  if (!cursorStr) return null;
  try {
    const json = Buffer.from(cursorStr, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
