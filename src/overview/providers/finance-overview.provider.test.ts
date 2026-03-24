import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFinanceOverviewInsights } from './finance-overview.provider';

test('buildFinanceOverviewInsights returns an empty-state insight when there is no finance activity', () => {
  const insights = buildFinanceOverviewInsights({
    totalTransactions: 0,
    inflowTotal: 0,
    outflowTotal: 0,
    netCashFlow: 0,
    reconciledTransactionsCount: 0,
    postedJournalEntries: 0,
    draftJournalEntries: 0,
    openReconciliations: 0,
    closedReconciliations: 0,
    reconciliationGapTotal: 0,
    averageMonthlyOutflow: 0
  });

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.code, 'finance_empty');
});

test('buildFinanceOverviewInsights flags negative cash flow and open reconciliation issues', () => {
  const insights = buildFinanceOverviewInsights({
    totalTransactions: 8,
    inflowTotal: 900,
    outflowTotal: 1400,
    netCashFlow: -500,
    reconciledTransactionsCount: 0,
    postedJournalEntries: 2,
    draftJournalEntries: 4,
    openReconciliations: 3,
    closedReconciliations: 1,
    reconciliationGapTotal: 1400,
    averageMonthlyOutflow: 550
  });

  assert.ok(insights.some((insight) => insight.code === 'finance_negative_cash_flow'));
  assert.ok(insights.some((insight) => insight.code === 'finance_draft_journal_entries'));
  assert.ok(insights.some((insight) => insight.code === 'finance_open_reconciliations'));
  assert.ok(insights.some((insight) => insight.code === 'finance_reconciliation_gap'));
  assert.ok(insights.some((insight) => insight.code === 'finance_unreconciled_transactions'));
});
