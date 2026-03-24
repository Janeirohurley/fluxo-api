import { Prisma } from '@prisma/client';

import {
  type OverviewInsight,
  type OverviewModuleResult,
  type OverviewProvider,
  type OverviewProviderContext
} from '../overview.types';

type FinanceOverviewMetrics = {
  totalTransactions: number;
  inflowTotal: number;
  outflowTotal: number;
  netCashFlow: number;
  reconciledTransactionsCount: number;
  postedJournalEntries: number;
  draftJournalEntries: number;
  openReconciliations: number;
  closedReconciliations: number;
  reconciliationGapTotal: number;
  averageMonthlyOutflow: number;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  return value?.toNumber() ?? 0;
}

function roundMetric(value: number | null, digits = 2) {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function buildRollingMonthSeries(offsetFromCurrentMonth: number, months: number) {
  const today = new Date();
  const startMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offsetFromCurrentMonth, 1)
  );

  return Array.from({ length: months }, (_value, index) => addUtcMonths(startMonth, index));
}

function getTransactionDirection(transactionTypeName: string) {
  const normalized = transactionTypeName.trim().toLowerCase();

  if (['income', 'revenue', 'cash-in', 'cash_in'].includes(normalized)) {
    return 'inflow';
  }

  if (['expense', 'cash-out', 'cash_out'].includes(normalized)) {
    return 'outflow';
  }

  return 'neutral';
}

export function buildFinanceOverviewInsights(
  metrics: FinanceOverviewMetrics
): OverviewInsight[] {
  const insights: OverviewInsight[] = [];

  if (
    metrics.totalTransactions === 0 &&
    metrics.postedJournalEntries === 0 &&
    metrics.draftJournalEntries === 0 &&
    metrics.openReconciliations === 0 &&
    metrics.closedReconciliations === 0
  ) {
    insights.push({
      code: 'finance_empty',
      severity: 'info',
      message: 'No finance activity has been registered yet.'
    });
    return insights;
  }

  if (metrics.netCashFlow < 0) {
    insights.push({
      code: 'finance_negative_cash_flow',
      severity: metrics.netCashFlow <= metrics.outflowTotal * -0.2 ? 'critical' : 'warning',
      message: 'Cash out is currently higher than cash in.',
      value: roundMetric(metrics.netCashFlow)
    });
  }

  if (metrics.draftJournalEntries > 0) {
    insights.push({
      code: 'finance_draft_journal_entries',
      severity: metrics.draftJournalEntries >= 5 ? 'warning' : 'info',
      message: `${metrics.draftJournalEntries} journal entries are still in draft status.`,
      value: metrics.draftJournalEntries
    });
  }

  if (metrics.openReconciliations > 0) {
    insights.push({
      code: 'finance_open_reconciliations',
      severity: metrics.openReconciliations >= 3 ? 'warning' : 'info',
      message: `${metrics.openReconciliations} reconciliations are still open.`,
      value: metrics.openReconciliations
    });
  }

  if (metrics.reconciliationGapTotal > 0) {
    insights.push({
      code: 'finance_reconciliation_gap',
      severity: metrics.reconciliationGapTotal >= 1000 ? 'warning' : 'info',
      message: 'There is a remaining gap between statement and book balances.',
      value: roundMetric(metrics.reconciliationGapTotal)
    });
  }

  if (metrics.totalTransactions > 0 && metrics.reconciledTransactionsCount === 0) {
    insights.push({
      code: 'finance_unreconciled_transactions',
      severity: 'warning',
      message: 'Transactions exist but none of them are currently reconciled.',
      value: metrics.totalTransactions
    });
  }

  if (metrics.averageMonthlyOutflow > 0 && metrics.inflowTotal > 0) {
    const monthlyCoverageRatio = metrics.inflowTotal / (metrics.averageMonthlyOutflow * 3);

    if (monthlyCoverageRatio < 1) {
      insights.push({
        code: 'finance_low_cash_coverage',
        severity: 'warning',
        message: 'Recent average outflow is higher than current inflow coverage.',
        value: roundMetric(monthlyCoverageRatio, 4)
      });
    }
  }

  return insights;
}

export class FinanceOverviewProvider implements OverviewProvider {
  readonly module = 'finance' as const;

  async build(context: OverviewProviderContext): Promise<OverviewModuleResult> {
    const isMounted = context.mountedModules.includes(this.module);
    const isEnabled = isMounted && context.accessSession.modules.includes(this.module);

    if (!isMounted) {
      return {
        module: this.module,
        enabled: false,
        status: 'unavailable',
        description: 'Cash-flow, accounting and reconciliation overview',
        boundaries: [
          'payment-methods',
          'transaction-types',
          'accounting-accounts',
          'transactions',
          'journal-entries',
          'reconciliations'
        ],
        kpis: null,
        charts: null,
        insights: []
      };
    }

    if (!isEnabled) {
      return {
        module: this.module,
        enabled: false,
        status: 'disabled',
        description: 'Cash-flow, accounting and reconciliation overview',
        boundaries: [
          'payment-methods',
          'transaction-types',
          'accounting-accounts',
          'transactions',
          'journal-entries',
          'reconciliations'
        ],
        kpis: null,
        charts: null,
        insights: []
      };
    }

    if (!context.prisma) {
      return {
        module: this.module,
        enabled: true,
        status: 'unavailable',
        description: 'Cash-flow, accounting and reconciliation overview',
        boundaries: [
          'payment-methods',
          'transaction-types',
          'accounting-accounts',
          'transactions',
          'journal-entries',
          'reconciliations'
        ],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'finance_overview_unavailable',
            severity: 'warning',
            message: 'Finance overview requires a configured database connection.'
          }
        ]
      };
    }

    try {
      const [
        transactions,
        journalEntries,
        reconciliations,
        reconciliationItems,
        accountingAccounts
      ] = await context.prisma.$transaction([
        context.prisma.financeTransaction.findMany({
          select: {
            id: true,
            amount: true,
            accountingCategory: true,
            transactionDate: true,
            transactionType: {
              select: {
                name: true
              }
            }
          }
        }),
        context.prisma.journalEntry.findMany({
          select: {
            id: true,
            status: true,
            entryDate: true
          }
        }),
        context.prisma.reconciliation.findMany({
          select: {
            id: true,
            status: true,
            statementBalance: true,
            bookBalance: true,
            statementEndDate: true
          }
        }),
        context.prisma.reconciliationItem.findMany({
          select: {
            transactionId: true
          }
        }),
        context.prisma.accountingAccount.findMany({
          select: {
            id: true,
            isActive: true
          }
        })
      ]);

      const totalTransactions = transactions.length;
      const postedJournalEntries = journalEntries.filter((entry) => entry.status === 'posted').length;
      const draftJournalEntries = journalEntries.filter((entry) => entry.status === 'draft').length;
      const openReconciliations = reconciliations.filter(
        (reconciliation) => reconciliation.status === 'open'
      ).length;
      const closedReconciliations = reconciliations.filter(
        (reconciliation) => reconciliation.status === 'closed'
      ).length;
      const reconciliationGapTotal = reconciliations.reduce((sum, reconciliation) => {
        return (
          sum +
          Math.abs(
            toNumber(reconciliation.statementBalance) - toNumber(reconciliation.bookBalance)
          )
        );
      }, 0);
      const reconciledTransactionsCount = new Set(
        reconciliationItems
          .map((item) => item.transactionId)
          .filter((transactionId): transactionId is string => typeof transactionId === 'string')
      ).size;

      const transactionTotals = transactions.reduce(
        (result, transaction) => {
          const direction = getTransactionDirection(transaction.transactionType.name);
          const amount = toNumber(transaction.amount);

          if (direction === 'inflow') {
            result.inflow += amount;
          } else if (direction === 'outflow') {
            result.outflow += amount;
            result.categoryTotals.set(
              transaction.accountingCategory,
              (result.categoryTotals.get(transaction.accountingCategory) ?? 0) + amount
            );
          }

          return result;
        },
        {
          inflow: 0,
          outflow: 0,
          categoryTotals: new Map<string, number>()
        }
      );

      const cashFlowTrend = buildRollingMonthSeries(-5, 6).map((monthStart) => {
        const key = formatMonthKey(monthStart);
        const monthTransactions = transactions.filter(
          (transaction) => formatMonthKey(transaction.transactionDate) === key
        );
        const inflow = monthTransactions.reduce((sum, transaction) => {
          return getTransactionDirection(transaction.transactionType.name) === 'inflow'
            ? sum + toNumber(transaction.amount)
            : sum;
        }, 0);
        const outflow = monthTransactions.reduce((sum, transaction) => {
          return getTransactionDirection(transaction.transactionType.name) === 'outflow'
            ? sum + toNumber(transaction.amount)
            : sum;
        }, 0);

        return {
          key,
          label: key,
          inflow: roundMetric(inflow) ?? 0,
          outflow: roundMetric(outflow) ?? 0,
          net: roundMetric(inflow - outflow) ?? 0
        };
      });

      const averageMonthlyOutflow =
        cashFlowTrend.length > 0
          ? cashFlowTrend.reduce((sum, point) => sum + point.outflow, 0) / cashFlowTrend.length
          : 0;
      const topExpenseCategories = Array.from(transactionTotals.categoryTotals.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([category, value]) => ({
          key: category,
          label: category,
          value: roundMetric(value) ?? 0
        }));
      const journalEntriesByStatus = [
        {
          key: 'draft',
          label: 'draft',
          value: draftJournalEntries
        },
        {
          key: 'posted',
          label: 'posted',
          value: postedJournalEntries
        }
      ];
      const reconciliationsByStatus = [
        {
          key: 'open',
          label: 'open',
          value: openReconciliations
        },
        {
          key: 'closed',
          label: 'closed',
          value: closedReconciliations
        }
      ];
      const activeAccounts = accountingAccounts.filter((account) => account.isActive).length;
      const inactiveAccounts = Math.max(accountingAccounts.length - activeAccounts, 0);
      const metrics: FinanceOverviewMetrics = {
        totalTransactions,
        inflowTotal: transactionTotals.inflow,
        outflowTotal: transactionTotals.outflow,
        netCashFlow: transactionTotals.inflow - transactionTotals.outflow,
        reconciledTransactionsCount,
        postedJournalEntries,
        draftJournalEntries,
        openReconciliations,
        closedReconciliations,
        reconciliationGapTotal,
        averageMonthlyOutflow
      };

      return {
        module: this.module,
        enabled: true,
        status:
          totalTransactions === 0 &&
          journalEntries.length === 0 &&
          reconciliations.length === 0 &&
          accountingAccounts.length === 0
            ? 'empty'
            : 'ready',
        description: 'Cash-flow, accounting and reconciliation overview',
        boundaries: [
          'payment-methods',
          'transaction-types',
          'accounting-accounts',
          'transactions',
          'journal-entries',
          'reconciliations'
        ],
        kpis: {
          totalTransactions,
          inflowTotal: roundMetric(transactionTotals.inflow),
          outflowTotal: roundMetric(transactionTotals.outflow),
          netCashFlow: roundMetric(metrics.netCashFlow),
          reconciledTransactionsCount,
          unreconciledTransactionsCount: Math.max(totalTransactions - reconciledTransactionsCount, 0),
          postedJournalEntries,
          draftJournalEntries,
          openReconciliations,
          closedReconciliations,
          reconciliationGapTotal: roundMetric(reconciliationGapTotal),
          activeAccounts,
          inactiveAccounts,
          averageMonthlyOutflow: roundMetric(averageMonthlyOutflow)
        },
        charts: {
          cashFlowTrend,
          topExpenseCategories,
          journalEntriesByStatus,
          reconciliationsByStatus
        },
        insights: buildFinanceOverviewInsights(metrics)
      };
    } catch (error) {
      return {
        module: this.module,
        enabled: true,
        status: 'unavailable',
        description: 'Cash-flow, accounting and reconciliation overview',
        boundaries: [
          'payment-methods',
          'transaction-types',
          'accounting-accounts',
          'transactions',
          'journal-entries',
          'reconciliations'
        ],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'finance_overview_query_failed',
            severity: 'warning',
            message: error instanceof Error ? error.message : 'Finance overview query failed.'
          }
        ]
      };
    }
  }
}
