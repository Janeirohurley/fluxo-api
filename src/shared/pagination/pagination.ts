import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type HttpPagination = {
  count: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
};

export type PaginatedHttpResponse<T> = {
  data: T[];
  pagination?: HttpPagination;
};

export function createPaginationQuerySchema<TShape extends z.ZodRawShape>(shape: TShape) {
  return paginationQuerySchema.extend(shape);
}

export function buildPaginationMeta(query: PaginationQuery, total: number): PaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize))
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  query: PaginationQuery,
  total: number
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(query, total)
  };
}

export function slicePage<T>(items: T[], query: PaginationQuery) {
  const offset = (query.page - 1) * query.pageSize;

  return items.slice(offset, offset + query.pageSize);
}

export function buildPaginationLinks(meta: PaginationMeta, currentUrl: string) {
  const url = new URL(currentUrl, 'http://localhost');
  const setPage = (page: number) => {
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(meta.pageSize));
    return `${url.pathname}${url.search}`;
  };

  return {
    next: meta.page < meta.totalPages ? setPage(meta.page + 1) : null,
    previous: meta.page > 1 ? setPage(meta.page - 1) : null
  };
}

export function buildPaginatedHttpResponse<T>(
  result: PaginatedResult<T>,
  currentUrl: string
): PaginatedHttpResponse<T> {
  const links = buildPaginationLinks(result.meta, currentUrl);

  return {
    data: result.data,
    pagination: {
      count: result.meta.total,
      page_size: result.meta.pageSize,
      current_page: result.meta.page,
      total_pages: result.meta.totalPages,
      next: links.next,
      previous: links.previous
    }
  };
}
