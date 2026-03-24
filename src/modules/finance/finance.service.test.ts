import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError } from '../../shared/http-error';
import { InMemoryFinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

async function createServiceContext() {
  const repository = new InMemoryFinanceRepository();
  const service = new FinanceService(repository);
  const [paymentMethod] = await repository.listPaymentMethods();
  const [transactionType] = await repository.listTransactionTypes();
  const [expenseAccount, cashAccount] = await repository.listAccountingAccounts();

  if (!paymentMethod || !transactionType || !expenseAccount || !cashAccount) {
    throw new Error('Missing seeded finance references in test repository');
  }

  return {
    repository,
    service,
    paymentMethod,
    transactionType,
    expenseAccount,
    cashAccount
  };
}

test('listTransactions returns paginated and searchable results', async () => {
  const { service, paymentMethod, transactionType } = await createServiceContext();

  await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'office-supplies',
    amount: 15,
    paymentMethodId: paymentMethod.id,
    referenceNumber: 'TXN-003',
    transactionDate: '2026-03-03',
    description: 'Pens'
  });
  await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'office-supplies',
    amount: 40,
    paymentMethodId: paymentMethod.id,
    referenceNumber: 'TXN-002',
    transactionDate: '2026-03-02',
    description: 'Dell keyboard'
  });
  await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'office-supplies',
    amount: 80,
    paymentMethodId: paymentMethod.id,
    referenceNumber: 'TXN-001',
    transactionDate: '2026-03-01',
    description: 'Dell mouse'
  });

  const result = await service.listTransactions({
    page: 1,
    pageSize: 2,
    search: 'Dell',
    sortBy: 'transactionDate',
    sortOrder: 'asc'
  });

  assert.equal(result.meta.total, 2);
  assert.equal(result.data.length, 2);
  assert.deepEqual(
    result.data.map((transaction) => transaction.referenceNumber),
    ['TXN-001', 'TXN-002']
  );
});

test('postJournalEntry rejects already posted entries', async () => {
  const { service, expenseAccount, cashAccount } = await createServiceContext();
  const journalEntry = await service.createJournalEntry({
    entryNumber: 'JE-2026-0001',
    entryDate: '2026-03-24',
    periodYear: 2026,
    periodMonth: 3,
    status: 'posted',
    lines: [
      {
        accountId: expenseAccount.id,
        debitAmount: 120,
        creditAmount: 0
      },
      {
        accountId: cashAccount.id,
        debitAmount: 0,
        creditAmount: 120
      }
    ]
  });

  await assert.rejects(
    () => service.postJournalEntry(journalEntry.id, {}),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /already been posted/.test(error.message)
  );
});

test('removeTransaction rejects deletion once reconciliation exists', async () => {
  const { service, paymentMethod, transactionType, expenseAccount } = await createServiceContext();
  const transaction = await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'bank-fees',
    amount: 25,
    paymentMethodId: paymentMethod.id,
    transactionDate: '2026-03-24'
  });
  const reconciliation = await service.createReconciliation({
    reconciliationType: 'bank',
    accountId: expenseAccount.id,
    statementStartDate: '2026-03-01',
    statementEndDate: '2026-03-31',
    statementBalance: 2500,
    bookBalance: 2475,
    status: 'open'
  });

  await service.addReconciliationItem(reconciliation.id, {
    transactionId: transaction.id
  });

  await assert.rejects(
    () => service.removeTransaction(transaction.id),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /already linked to reconciliation items/.test(error.message)
  );
});

test('updateTransaction rejects updates once reconciliation exists', async () => {
  const { service, paymentMethod, transactionType, expenseAccount } = await createServiceContext();
  const transaction = await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'bank-fees',
    amount: 25,
    paymentMethodId: paymentMethod.id,
    transactionDate: '2026-03-24'
  });
  const reconciliation = await service.createReconciliation({
    reconciliationType: 'bank',
    accountId: expenseAccount.id,
    statementStartDate: '2026-03-01',
    statementEndDate: '2026-03-31',
    statementBalance: 2500,
    bookBalance: 2475,
    status: 'open'
  });

  await service.addReconciliationItem(reconciliation.id, {
    transactionId: transaction.id
  });

  await assert.rejects(
    () =>
      service.updateTransaction(transaction.id, {
        description: 'Should not be allowed'
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /already linked to reconciliation items/.test(error.message)
  );
});

test('addReconciliationItem rejects closed reconciliations', async () => {
  const { service, paymentMethod, transactionType, expenseAccount } = await createServiceContext();
  const transaction = await service.createTransaction({
    transactionTypeId: transactionType.id,
    accountingCategory: 'bank-fees',
    amount: 25,
    paymentMethodId: paymentMethod.id,
    transactionDate: '2026-03-24'
  });
  const reconciliation = await service.createReconciliation({
    reconciliationType: 'bank',
    accountId: expenseAccount.id,
    statementStartDate: '2026-03-01',
    statementEndDate: '2026-03-31',
    statementBalance: 2500,
    bookBalance: 2475,
    status: 'closed'
  });

  await assert.rejects(
    () =>
      service.addReconciliationItem(reconciliation.id, {
        transactionId: transaction.id
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /closed reconciliation/.test(error.message)
  );
});

test('addReconciliationItem rejects draft journal entry lines', async () => {
  const { service, expenseAccount, cashAccount } = await createServiceContext();
  const journalEntry = await service.createJournalEntry({
    entryNumber: 'JE-2026-0002',
    entryDate: '2026-03-24',
    periodYear: 2026,
    periodMonth: 3,
    status: 'draft',
    lines: [
      {
        accountId: expenseAccount.id,
        debitAmount: 100,
        creditAmount: 0
      },
      {
        accountId: cashAccount.id,
        debitAmount: 0,
        creditAmount: 100
      }
    ]
  });
  const reconciliation = await service.createReconciliation({
    reconciliationType: 'bank',
    accountId: expenseAccount.id,
    statementStartDate: '2026-03-01',
    statementEndDate: '2026-03-31',
    statementBalance: 500,
    bookBalance: 400,
    status: 'open'
  });

  await assert.rejects(
    () =>
      service.addReconciliationItem(reconciliation.id, {
        journalEntryLineId: journalEntry.lines[0]!.id
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /posted journal entries/.test(error.message)
  );
});

test('closeReconciliation rejects empty reconciliations', async () => {
  const { service, expenseAccount } = await createServiceContext();
  const reconciliation = await service.createReconciliation({
    reconciliationType: 'bank',
    accountId: expenseAccount.id,
    statementStartDate: '2026-03-01',
    statementEndDate: '2026-03-31',
    statementBalance: 2500,
    bookBalance: 2475,
    status: 'open'
  });

  await assert.rejects(
    () => service.closeReconciliation(reconciliation.id, {}),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 409 &&
      /without matched items/.test(error.message)
  );
});
