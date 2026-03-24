import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPaginatedHttpResponse,
  buildPaginatedResult,
  paginationQuerySchema,
  slicePage
} from './pagination';

test('paginationQuerySchema exposes shared default paging values', () => {
  const result = paginationQuerySchema.parse({});

  assert.deepEqual(result, {
    page: 1,
    pageSize: 20
  });
});

test('buildPaginatedResult computes shared pagination metadata', () => {
  const result = buildPaginatedResult(['a', 'b'], { page: 2, pageSize: 2 }, 5);

  assert.deepEqual(result.meta, {
    page: 2,
    pageSize: 2,
    total: 5,
    totalPages: 3
  });
});

test('buildPaginatedHttpResponse exposes the public pagination contract', () => {
  const result = buildPaginatedHttpResponse(
    buildPaginatedResult(['a', 'b'], { page: 2, pageSize: 2 }, 5),
    '/api/assets?page=2&pageSize=2&search=dell'
  );

  assert.deepEqual(result.pagination, {
    count: 5,
    page_size: 2,
    current_page: 2,
    total_pages: 3,
    next: '/api/assets?page=3&pageSize=2&search=dell',
    previous: '/api/assets?page=1&pageSize=2&search=dell'
  });
});

test('slicePage returns the current page slice', () => {
  const result = slicePage([1, 2, 3, 4, 5], { page: 2, pageSize: 2 });

  assert.deepEqual(result, [3, 4]);
});
