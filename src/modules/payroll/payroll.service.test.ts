import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError } from '../../shared/http-error';
import { InMemoryPayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';

async function createServiceContext() {
  const repository = new InMemoryPayrollRepository();
  const service = new PayrollService(repository);
  const contracts = await repository.listContracts({
    page: 1,
    pageSize: 10,
    sortBy: 'startDate',
    sortOrder: 'desc'
  });
  const primaryContract = contracts.items[0];
  const secondaryContract = contracts.items[1];

  if (!primaryContract || !secondaryContract) {
    throw new Error('Missing seeded payroll contracts in test repository');
  }

  return {
    repository,
    service,
    primaryContract,
    secondaryContract
  };
}

test('createPaySlip computes totals from payroll lines', async () => {
  const { service, primaryContract } = await createServiceContext();
  const paySlip = await service.createPaySlip({
    employeeId: primaryContract.employeeId,
    contractId: primaryContract.id,
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      },
      {
        lineType: 'benefit',
        label: 'Transport',
        amount: 100
      },
      {
        lineType: 'tax',
        label: 'PAYE',
        amount: 150
      }
    ]
  });

  assert.equal(paySlip.grossAmount, 1100);
  assert.equal(paySlip.totalDeductions, 150);
  assert.equal(paySlip.netAmount, 950);
  assert.equal(paySlip.status, 'draft');
});

test('createPaySlip rejects employee and contract mismatches', async () => {
  const { service, primaryContract, secondaryContract } = await createServiceContext();

  await assert.rejects(
    () =>
      service.createPaySlip({
        employeeId: primaryContract.employeeId,
        contractId: secondaryContract.id,
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        lines: [
          {
            lineType: 'earning',
            label: 'Base salary',
            amount: 1000
          }
        ]
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /does not belong/.test(error.message)
  );
});

test('issuePaySlip and markPaySlipPaid enforce the payroll lifecycle', async () => {
  const { service, primaryContract } = await createServiceContext();
  const paySlip = await service.createPaySlip({
    employeeId: primaryContract.employeeId,
    contractId: primaryContract.id,
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      }
    ]
  });

  await assert.rejects(
    () => service.markPaySlipPaid(paySlip.id, {}),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /Only issued payslips/.test(error.message)
  );

  const issued = await service.issuePaySlip(paySlip.id);
  assert.equal(issued.status, 'issued');

  const paid = await service.markPaySlipPaid(paySlip.id, {
    paymentDate: '2026-03-31'
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.paymentDate, '2026-03-31');
});

test('updatePaySlip rejects non-draft payslips', async () => {
  const { service, primaryContract } = await createServiceContext();
  const paySlip = await service.createPaySlip({
    employeeId: primaryContract.employeeId,
    contractId: primaryContract.id,
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      }
    ]
  });

  await service.issuePaySlip(paySlip.id);

  await assert.rejects(
    () =>
      service.updatePaySlip(paySlip.id, {
        notes: 'Should not update'
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /Only draft payslips can be updated/.test(error.message)
  );
});

test('createJournalEntryForPaySlip requires an issued payslip and links finance data', async () => {
  const { service, primaryContract } = await createServiceContext();
  const paySlip = await service.createPaySlip({
    employeeId: primaryContract.employeeId,
    contractId: primaryContract.id,
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    currency: 'BIF',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      },
      {
        lineType: 'tax',
        label: 'PAYE',
        amount: 100
      }
    ]
  });

  await assert.rejects(
    () =>
      service.createJournalEntryForPaySlip(paySlip.id, {
        expenseAccountId: '11111111-1111-4111-8111-111111111111',
        payrollPayableAccountId: '22222222-2222-4222-8222-222222222222',
        status: 'draft'
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /must be issued/.test(error.message)
  );

  await service.issuePaySlip(paySlip.id);
  const result = await service.createJournalEntryForPaySlip(paySlip.id, {
    expenseAccountId: '11111111-1111-4111-8111-111111111111',
    payrollPayableAccountId: '22222222-2222-4222-8222-222222222222',
    deductionsPayableAccountId: '33333333-3333-4333-8333-333333333333',
    status: 'draft'
  });

  assert.equal(result.journalEntry.status, 'draft');
  assert.equal(result.paySlip.linkedJournalEntries?.length, 1);
});

test('registerPaymentForPaySlip creates one linked finance transaction and marks the payslip paid', async () => {
  const { service, primaryContract } = await createServiceContext();
  const paySlip = await service.createPaySlip({
    employeeId: primaryContract.employeeId,
    contractId: primaryContract.id,
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    currency: 'BIF',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      }
    ]
  });

  await service.issuePaySlip(paySlip.id);
  const result = await service.registerPaymentForPaySlip(paySlip.id, {
    transactionTypeId: '44444444-4444-4444-8444-444444444444',
    paymentMethodId: '55555555-5555-4555-8555-555555555555',
    transactionDate: '2026-03-31',
    markAsPaid: true
  });

  assert.equal(result.paySlip.status, 'paid');
  assert.equal(result.transaction.accountingCategory, 'payroll');
  assert.equal(result.paySlip.linkedTransactions?.length, 1);

  await assert.rejects(
    () =>
      service.registerPaymentForPaySlip(paySlip.id, {
        transactionTypeId: '44444444-4444-4444-8444-444444444444',
        paymentMethodId: '55555555-5555-4555-8555-555555555555'
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /already has a linked finance transaction/.test(error.message)
  );
});

test('generatePayRun creates one draft payslip per eligible active contract and skips duplicates', async () => {
  const { service } = await createServiceContext();

  const firstRun = await service.generatePayRun({
    payPeriodStart: '2026-04-01',
    payPeriodEnd: '2026-04-30',
    paymentDate: '2026-04-30',
    earningLabel: 'Base salary',
    skipExisting: true
  });

  assert.equal(firstRun.createdCount, 2);
  assert.equal(firstRun.skippedCount, 0);
  assert.equal(firstRun.created[0]?.status, 'draft');

  const secondRun = await service.generatePayRun({
    payPeriodStart: '2026-04-01',
    payPeriodEnd: '2026-04-30',
    paymentDate: '2026-04-30',
    skipExisting: true
  });

  assert.equal(secondRun.createdCount, 0);
  assert.equal(secondRun.skippedCount, 2);
  assert.equal(secondRun.skipped[0]?.reason, 'payslip_already_exists');
});
