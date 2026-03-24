import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError } from '../../shared/http-error';
import { InMemoryAssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

async function createServiceContext() {
  const repository = new InMemoryAssetsRepository();
  const service = new AssetsService(repository);
  const [category] = await repository.listCategories();
  const statuses = await repository.listStatuses();
  const activeStatus = statuses.find((status) => status.name === 'active');
  const disposedStatus = statuses.find((status) => status.name === 'disposed');

  if (!category || !activeStatus || !disposedStatus) {
    throw new Error('Missing seeded asset references in test repository');
  }

  return {
    repository,
    service,
    category,
    activeStatus,
    disposedStatus
  };
}

test('listAssets returns paginated and searchable results', async () => {
  const { service, category, activeStatus } = await createServiceContext();

  await service.createAsset({
    inventoryCode: 'AST-003',
    name: 'Office Chair',
    categoryId: category.id,
    statusId: activeStatus.id
  });
  await service.createAsset({
    inventoryCode: 'AST-002',
    name: 'Dell Latitude 7440',
    brand: 'Dell',
    categoryId: category.id,
    statusId: activeStatus.id
  });
  await service.createAsset({
    inventoryCode: 'AST-001',
    name: 'Dell Dock',
    brand: 'Dell',
    categoryId: category.id,
    statusId: activeStatus.id
  });

  const result = await service.listAssets({
    page: 1,
    pageSize: 2,
    search: 'Dell',
    sortBy: 'inventoryCode',
    sortOrder: 'asc'
  });

  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.totalPages, 1);
  assert.equal(result.data.length, 2);
  assert.deepEqual(
    result.data.map((asset) => asset.inventoryCode),
    ['AST-001', 'AST-002']
  );
});

test('createAssignment rejects overlapping assignment periods', async () => {
  const { service, category, activeStatus } = await createServiceContext();
  const asset = await service.createAsset({
    inventoryCode: 'AST-100',
    name: 'Lenovo ThinkPad',
    categoryId: category.id,
    statusId: activeStatus.id
  });

  await service.createAssignment(asset.id, {
    employeeId: '11111111-1111-1111-1111-111111111111',
    locationId: '22222222-2222-2222-2222-222222222222',
    startDate: '2026-01-01',
    endDate: '2026-03-31'
  });

  await assert.rejects(
    () =>
      service.createAssignment(asset.id, {
        employeeId: '33333333-3333-3333-3333-333333333333',
        locationId: '44444444-4444-4444-4444-444444444444',
        startDate: '2026-03-15',
        endDate: '2026-04-30'
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /already has an assignment covering the requested period/.test(error.message)
  );
});

test('removeAsset rejects deletion once history exists', async () => {
  const { service, category, activeStatus } = await createServiceContext();
  const asset = await service.createAsset({
    inventoryCode: 'AST-200',
    name: 'HP ProBook',
    categoryId: category.id,
    statusId: activeStatus.id
  });

  await service.upsertAssetFinance(asset.id, {
    acquisitionDate: '2026-03-24',
    purchaseValue: 800,
    estimatedLifeYears: 3,
    residualValue: 50
  });

  await assert.rejects(
    () => service.removeAsset(asset.id),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /Cannot delete an asset that already has finance or history records/.test(error.message)
  );
});

test('updateAsset rejects disposed status when the asset still has an active assignment', async () => {
  const { service, category, activeStatus, disposedStatus } = await createServiceContext();
  const asset = await service.createAsset({
    inventoryCode: 'AST-300',
    name: 'MacBook Pro',
    categoryId: category.id,
    statusId: activeStatus.id
  });

  await service.createAssignment(asset.id, {
    employeeId: '55555555-5555-5555-5555-555555555555',
    locationId: '66666666-6666-6666-6666-666666666666',
    startDate: '2026-03-24'
  });

  await assert.rejects(
    () =>
      service.updateAsset(asset.id, {
        statusId: disposedStatus.id
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /cannot be marked as disposed/.test(error.message)
  );
});
