import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAssetAssignmentSchema,
  listAssetsQuerySchema,
  updateAssetSchema,
  upsertAssetFinanceSchema
} from './assets.schema';

test('listAssetsQuerySchema applies production-friendly defaults', () => {
  const result = listAssetsQuerySchema.parse({});

  assert.deepEqual(result, {
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
});

test('updateAssetSchema rejects empty patch payloads', () => {
  assert.throws(() => updateAssetSchema.parse({}), {
    message: /At least one field must be provided for update/
  });
});

test('upsertAssetFinanceSchema rejects residual value above purchase value', () => {
  assert.throws(
    () =>
      upsertAssetFinanceSchema.parse({
        acquisitionDate: '2026-03-24',
        purchaseValue: 1000,
        estimatedLifeYears: 4,
        residualValue: 1200
      }),
    {
      message: /Residual value cannot be greater than purchase value/
    }
  );
});

test('createAssetAssignmentSchema rejects end dates before start dates', () => {
  assert.throws(
    () =>
      createAssetAssignmentSchema.parse({
        employeeId: '11111111-1111-1111-1111-111111111111',
        locationId: '22222222-2222-2222-2222-222222222222',
        startDate: '2026-04-10',
        endDate: '2026-04-01'
      }),
    {
      message: /End date cannot be before start date/
    }
  );
});
