import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryEmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';

async function createServiceFixture() {
  const repository = new InMemoryEmployeesRepository();
  const service = new EmployeesService(repository);
  const [role] = await service.listRoles();
  const [position] = await service.listPositions();
  const [location] = await service.listLocations();

  return { service, role, position, location };
}

test('listEmployees returns paginated and searchable results', async () => {
  const { service } = await createServiceFixture();

  await service.createEmployee({
    employeeNumber: 'EMP-001',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+257700000001',
    hireDate: '2026-03-24',
    status: 'active'
  });

  await service.createEmployee({
    employeeNumber: 'EMP-002',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    phone: '+257700000002',
    hireDate: '2026-03-23',
    status: 'inactive'
  });

  const result = await service.listEmployees({
    page: 1,
    pageSize: 10,
    sortBy: 'employeeNumber',
    sortOrder: 'asc',
    search: 'Jane'
  });

  assert.equal(result.meta.total, 1);
  assert.equal(result.data[0]?.employeeNumber, 'EMP-001');
});

test('createAssignment rejects overlapping assignment periods', async () => {
  const { service, role, position, location } = await createServiceFixture();
  const employee = await service.createEmployee({
    employeeNumber: 'EMP-101',
    firstName: 'Alice',
    lastName: 'Ndayizeye',
    hireDate: '2026-03-01',
    status: 'active'
  });

  await service.createAssignment(employee.id, {
    roleId: role.id,
    positionId: position.id,
    locationId: location.id,
    startDate: '2026-03-01',
    endDate: '2026-03-31'
  });

  await assert.rejects(
    () =>
      service.createAssignment(employee.id, {
        roleId: role.id,
        positionId: position.id,
        locationId: location.id,
        startDate: '2026-03-15',
        endDate: '2026-04-15'
      }),
    /already has an assignment/
  );
});

test('createContract rejects overlapping active contracts', async () => {
  const { service } = await createServiceFixture();
  const employee = await service.createEmployee({
    employeeNumber: 'EMP-201',
    firstName: 'Bob',
    lastName: 'Hakizimana',
    hireDate: '2026-03-01',
    status: 'active'
  });

  await service.createContract(employee.id, {
    contractType: 'full-time',
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    salaryAmount: 1500000,
    currency: 'BIF',
    paymentFrequency: 'monthly'
  });

  await assert.rejects(
    () =>
      service.createContract(employee.id, {
        contractType: 'consulting',
        status: 'active',
        startDate: '2026-06-01',
        endDate: '2026-10-31',
        salaryAmount: 900000,
        currency: 'BIF',
        paymentFrequency: 'monthly'
      }),
    /already has a contract/
  );
});

test('removeEmployee rejects deletion once history exists', async () => {
  const { service, role, position, location } = await createServiceFixture();
  const employee = await service.createEmployee({
    employeeNumber: 'EMP-301',
    firstName: 'Carine',
    lastName: 'Uwase',
    hireDate: '2026-03-01',
    status: 'active'
  });

  await service.createAssignment(employee.id, {
    roleId: role.id,
    positionId: position.id,
    locationId: location.id,
    startDate: '2026-03-01'
  });

  await assert.rejects(() => service.removeEmployee(employee.id), /cannot be deleted/);
});
