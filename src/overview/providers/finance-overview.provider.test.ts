import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFinanceOverviewInsights } from './finance-overview.provider';

function createMetrics(
  overrides: Partial<Parameters<typeof buildFinanceOverviewInsights>[0]> = {}
) {
  return {
    totalTransactions: 0,
    inflowTotal: 0,
    outflowTotal: 0,
    netCashFlow: 0,
    currentBalanceAllAccounts: null,
    totalCashOnHand: null,
    accountsReceivable: null,
    accountsPayable: null,
    taxLiabilityEstimate: null,
    burnRate: null,
    burnRunwayMonths: null,
    reconciledTransactionsCount: 0,
    postedJournalEntries: 0,
    draftJournalEntries: 0,
    unpostedEntriesCount: 0,
    unpostedEntriesValue: 0,
    openReconciliations: 0,
    closedReconciliations: 0,
    reconciliationGapTotal: 0,
    averageMonthlyOutflow: 0,
    reconciliationOverdueDays: null,
    ...overrides
  };
}

test('buildFinanceOverviewInsights returns an empty-state insight when there is no finance activity', () => {
  const insights = buildFinanceOverviewInsights(createMetrics());

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.code, 'finance_empty');
});

test('buildFinanceOverviewInsights flags negative cash flow and open reconciliation issues', () => {
  const insights = buildFinanceOverviewInsights(createMetrics({
    totalTransactions: 8,
    inflowTotal: 900,
    outflowTotal: 1400,
    netCashFlow: -500,
    currentBalanceAllAccounts: 1200,
    totalCashOnHand: 1200,
    burnRate: 180,
    burnRunwayMonths: 4.2,
    reconciledTransactionsCount: 0,
    postedJournalEntries: 2,
    draftJournalEntries: 4,
    unpostedEntriesCount: 4,
    unpostedEntriesValue: 980,
    openReconciliations: 3,
    closedReconciliations: 1,
    reconciliationGapTotal: 1400,
    averageMonthlyOutflow: 550,
    reconciliationOverdueDays: 21
  }));

  assert.ok(insights.some((insight) => insight.code === 'finance_negative_cash_flow'));
  assert.ok(insights.some((insight) => insight.code === 'finance_draft_journal_entries'));
  assert.ok(insights.some((insight) => insight.code === 'finance_open_reconciliations'));
  assert.ok(insights.some((insight) => insight.code === 'finance_reconciliation_gap'));
  assert.ok(insights.some((insight) => insight.code === 'finance_unreconciled_transactions'));
  assert.ok(insights.some((insight) => insight.code === 'finance_unposted_entries_pending'));
  assert.ok(insights.some((insight) => insight.code === 'finance_reconciliation_overdue'));
  assert.ok(insights.some((insight) => insight.code === 'finance_low_runway'));
});

test('buildFinanceOverviewInsights explains unavailable metrics when the data model is missing them', () => {
  const insights = buildFinanceOverviewInsights(createMetrics({
    totalTransactions: 2,
    inflowTotal: 100,
    outflowTotal: 50,
    netCashFlow: 50
  }), {
    supportsBudgeting: false,
    supportsCounterparties: false,
    supportsScheduledPayments: false
  });

  assert.ok(insights.some((insight) => insight.code === 'finance_budgeting_unavailable'));
  assert.ok(insights.some((insight) => insight.code === 'finance_counterparties_unavailable'));
  assert.ok(insights.some((insight) => insight.code === 'finance_scheduled_payments_unavailable'));
});
