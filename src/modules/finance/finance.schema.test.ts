import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createJournalEntrySchema,
  createReconciliationItemSchema,
  createReconciliationSchema,
  listTransactionsQuerySchema
} from './finance.schema';

test('listTransactionsQuerySchema applies production-friendly defaults', () => {
  const result = listTransactionsQuerySchema.parse({});

  assert.deepEqual(result, {
    page: 1,
    pageSize: 20,
    sortBy: 'transactionDate',
    sortOrder: 'desc'
  });
});

test('createJournalEntrySchema rejects unbalanced entries', () => {
  assert.throws(
    () =>
      createJournalEntrySchema.parse({
        entryNumber: 'JE-001',
        entryDate: '2026-03-24',
        periodYear: 2026,
        periodMonth: 3,
        status: 'draft',
        lines: [
          {
            accountId: '11111111-1111-1111-1111-111111111111',
            debitAmount: 120,
            creditAmount: 0
          },
          {
            accountId: '22222222-2222-2222-2222-222222222222',
            debitAmount: 0,
            creditAmount: 100
          }
        ]
      }),
    {
      message: /must be balanced/
    }
  );
});

test('createReconciliationSchema rejects invalid statement date ranges', () => {
  assert.throws(
    () =>
      createReconciliationSchema.parse({
        reconciliationType: 'bank',
        accountId: '11111111-1111-1111-1111-111111111111',
        statementStartDate: '2026-03-31',
        statementEndDate: '2026-03-01',
        statementBalance: 1000,
        bookBalance: 980,
        status: 'open'
      }),
    {
      message: /statementEndDate cannot be before statementStartDate/
    }
  );
});

test('createReconciliationItemSchema requires exactly one source link', () => {
  assert.throws(
    () =>
      createReconciliationItemSchema.parse({
        transactionId: '11111111-1111-1111-1111-111111111111',
        journalEntryLineId: '22222222-2222-2222-2222-222222222222'
      }),
    {
      message: /Exactly one source must be provided/
    }
  );
});
