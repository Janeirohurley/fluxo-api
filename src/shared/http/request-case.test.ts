import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceRequestSection, toCamelCaseRequest } from './request-case';

test('toCamelCaseRequest converts nested snake_case payloads to camelCase', () => {
  const result = toCamelCaseRequest({
    company_name: 'Fluxo',
    requested_modules: [
      {
        module_name: 'assets'
      }
    ],
    pagination: {
      page_size: 20,
      current_page: 1
    }
  });

  assert.deepEqual(result, {
    companyName: 'Fluxo',
    requestedModules: [
      {
        moduleName: 'assets'
      }
    ],
    pagination: {
      pageSize: 20,
      currentPage: 1
    }
  });
});

test('replaceRequestSection mutates the target object in place', () => {
  const target: Record<string, string> = {
    page_size: '10',
    search_term: 'dell'
  };

  const result = replaceRequestSection(target, {
    pageSize: '10',
    searchTerm: 'dell'
  });

  assert.equal(result, target);
  assert.deepEqual(target, {
    pageSize: '10',
    searchTerm: 'dell'
  });
});
