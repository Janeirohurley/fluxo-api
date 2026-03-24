import assert from 'node:assert/strict';
import test from 'node:test';

import { toSnakeCaseResponse } from './response-case';

test('toSnakeCaseResponse converts nested JSON payloads to snake_case', () => {
  const result = toSnakeCaseResponse({
    message: 'ok',
    requestId: 'abc',
    data: [
      {
        inventoryCode: 'AST-001',
        category: {
          createdAt: '2026-03-24T00:00:00.000Z'
        }
      }
    ],
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalPages: 3
    }
  });

  assert.deepEqual(result, {
    message: 'ok',
    request_id: 'abc',
    data: [
      {
        inventory_code: 'AST-001',
        category: {
          created_at: '2026-03-24T00:00:00.000Z'
        }
      }
    ],
    pagination: {
      current_page: 1,
      page_size: 20,
      total_pages: 3
    }
  });
});

test('toSnakeCaseResponse leaves arrays and primitive values intact', () => {
  const result = toSnakeCaseResponse(['a', 1, true, null]);

  assert.deepEqual(result, ['a', 1, true, null]);
});
