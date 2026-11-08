import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function toSkipTake({ page, limit }: PaginationQuery): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(query: PaginationQuery, total: number): PaginationMeta {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
