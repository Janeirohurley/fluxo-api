import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmployeeAssignmentSchema,
  createEmployeeContractSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema
} from './employees.schema';

test('listEmployeesQuerySchema applies production-friendly defaults', () => {
  const parsed = listEmployeesQuerySchema.parse({});

  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 20);
  assert.equal(parsed.sortBy, 'createdAt');
  assert.equal(parsed.sortOrder, 'desc');
});

test('updateEmployeeSchema rejects empty patch payloads', () => {
  const result = updateEmployeeSchema.safeParse({});

  assert.equal(result.success, false);
});

test('createEmployeeAssignmentSchema rejects end dates before start dates', () => {
  const result = createEmployeeAssignmentSchema.safeParse({
    roleId: '11111111-1111-1111-1111-111111111111',
    positionId: '22222222-2222-2222-2222-222222222222',
    locationId: '33333333-3333-3333-3333-333333333333',
    startDate: '2026-03-24',
    endDate: '2026-03-01'
  });

  assert.equal(result.success, false);
});

test('createEmployeeContractSchema rejects end dates before start dates', () => {
  const result = createEmployeeContractSchema.safeParse({
    contractType: 'full-time',
    startDate: '2026-03-24',
    endDate: '2026-02-24',
    salaryAmount: 1000,
    currency: 'BIF',
    paymentFrequency: 'monthly',
    status: 'active'
  });

  assert.equal(result.success, false);
});
