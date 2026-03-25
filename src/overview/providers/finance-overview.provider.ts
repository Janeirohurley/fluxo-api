import {
  type OverviewInsight,
  type OverviewModuleResult,
  type OverviewProvider,
  type OverviewProviderContext
} from '../overview.types';
import { type TenantDecimal } from '../../shared/tenant-prisma';

type FinanceOverviewMetrics = {
  totalTransactions: number;
  inflowTotal: number;
  outflowTotal: number;
  netCashFlow: number;
  currentBalanceAllAccounts: number | null;
  totalCashOnHand: number | null;
  accountsReceivable: number | null;
  accountsPayable: number | null;
  taxLiabilityEstimate: number | null;
  burnRate: number | null;
  burnRunwayMonths: number | null;
  reconciledTransactionsCount: number;
  postedJournalEntries: number;
  draftJournalEntries: number;
  unpostedEntriesCount: number;
  unpostedEntriesValue: number;
  openReconciliations: number;
  closedReconciliations: number;
  reconciliationGapTotal: number;
  averageMonthlyOutflow: number;
  reconciliationOverdueDays: number | null;
};

function toNumber(value: TenantDecimal | number | null | undefined) {
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

function daysDifference(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
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

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function isCashAccount(account: { code: string; name: string }) {
  const code = account.code.trim();
  const name = normalizeLabel(account.name);

  return (
    code.startsWith('100') ||
    name.includes('cash') ||
    name.includes('bank') ||
    name.includes('caisse') ||
    name.includes('treasury')
  );
}

function isReceivableAccount(account: { code: string; name: string }) {
  const code = account.code.trim();
  const name = normalizeLabel(account.name);

  return (
    code.startsWith('110') ||
    name.includes('receivable') ||
    name.includes('debtor') ||
    name.includes('client')
  );
}

function isPayableAccount(account: { code: string; name: string }) {
  const code = account.code.trim();
  const name = normalizeLabel(account.name);

  return (
    code.startsWith('200') ||
    name.includes('payable') ||
    name.includes('creditor') ||
    name.includes('supplier') ||
    name.includes('fournisseur')
  );
}

function isTaxLiabilityAccount(account: { code: string; name: string; accountType: string }) {
  const name = normalizeLabel(account.name);

  return (
    account.accountType === 'liability' &&
    (name.includes('tax') ||
      name.includes('vat') ||
      name.includes('tva') ||
      name.includes('taxe') ||
      name.includes('impot'))
  );
}

export function buildFinanceOverviewInsights(
  metrics: FinanceOverviewMetrics,
  options: {
    supportsBudgeting?: boolean;
    supportsScheduledPayments?: boolean;
    supportsCounterparties?: boolean;
  } = {}
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

  if (
    metrics.reconciliationOverdueDays !== null &&
    metrics.reconciliationOverdueDays > 15
  ) {
    insights.push({
      code: 'finance_reconciliation_overdue',
      severity: metrics.reconciliationOverdueDays > 30 ? 'warning' : 'info',
      message: `The latest reconciliation is ${metrics.reconciliationOverdueDays} days old.`,
      value: metrics.reconciliationOverdueDays
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

  if (metrics.unpostedEntriesCount > 0) {
    insights.push({
      code: 'finance_unposted_entries_pending',
      severity: metrics.unpostedEntriesCount >= 5 ? 'warning' : 'info',
      message: `${metrics.unpostedEntriesCount} journal entries are waiting to be posted.`,
      value: metrics.unpostedEntriesValue
    });
  }

  if (metrics.burnRunwayMonths !== null && metrics.burnRunwayMonths < 6) {
    insights.push({
      code: 'finance_low_runway',
      severity: metrics.burnRunwayMonths < 3 ? 'critical' : 'warning',
      message: 'Cash runway is short based on the recent burn rate.',
      value: roundMetric(metrics.burnRunwayMonths, 2)
    });
  }

  if (options.supportsBudgeting === false) {
    insights.push({
      code: 'finance_budgeting_unavailable',
      severity: 'info',
      message: 'Budget utilization cannot be calculated yet because no budget structure exists.'
    });
  }

  if (options.supportsCounterparties === false) {
    insights.push({
      code: 'finance_counterparties_unavailable',
      severity: 'info',
      message: 'Top debtors and creditors require explicit counterparty data.'
    });
  }

  if (options.supportsScheduledPayments === false) {
    insights.push({
      code: 'finance_scheduled_payments_unavailable',
      severity: 'info',
      message: 'Upcoming large payments require due dates or scheduled payments in the data model.'
    });
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
      const prisma = context.prisma as any;
      const generatedAt = new Date(context.generatedAt);
      const [
        transactions,
        journalEntries,
        journalEntryLines,
        reconciliations,
        reconciliationItems,
        accountingAccounts
      ] = await prisma.$transaction([
        prisma.financeTransaction.findMany({
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
        prisma.journalEntry.findMany({
          select: {
            id: true,
            status: true,
            entryDate: true
          }
        }),
        prisma.journalEntryLine.findMany({
          select: {
            debitAmount: true,
            creditAmount: true,
            journalEntry: {
              select: {
                status: true
              }
            },
            account: {
              select: {
                code: true,
                name: true,
                accountType: true
              }
            }
          }
        }),
        prisma.reconciliation.findMany({
          select: {
            id: true,
            status: true,
            statementBalance: true,
            bookBalance: true,
            statementEndDate: true
          }
        }),
        prisma.reconciliationItem.findMany({
          select: {
            transactionId: true
          }
        }),
        prisma.accountingAccount.findMany({
          select: {
            id: true,
            isActive: true
          }
        })
      ]);

      const totalTransactions = transactions.length;
      const postedJournalEntries = journalEntries.filter((entry: any) => entry.status === 'posted').length;
      const draftJournalEntries = journalEntries.filter((entry: any) => entry.status === 'draft').length;
      const openReconciliations = reconciliations.filter(
        (reconciliation: any) => reconciliation.status === 'open'
      ).length;
      const closedReconciliations = reconciliations.filter(
        (reconciliation: any) => reconciliation.status === 'closed'
      ).length;
      const reconciliationGapTotal = reconciliations.reduce((sum: number, reconciliation: any) => {
        return (
          sum +
          Math.abs(
            toNumber(reconciliation.statementBalance) - toNumber(reconciliation.bookBalance)
          )
        );
      }, 0);
      const reconciledTransactionsCount = new Set(
        reconciliationItems
          .map((item: any) => item.transactionId)
          .filter((transactionId: unknown): transactionId is string => typeof transactionId === 'string')
      ).size;

      const transactionTotals = transactions.reduce(
        (
          result: { inflow: number; outflow: number; categoryTotals: Map<string, number> },
          transaction: any
        ) => {
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

      const postedJournalLines = journalEntryLines.filter(
        (line: any) => line.journalEntry.status === 'posted'
      );
      const draftJournalLines = journalEntryLines.filter(
        (line: any) => line.journalEntry.status === 'draft'
      );
      const calculateAccountBalance = (
        predicate: (account: { code: string; name: string; accountType: string }) => boolean,
        normalSide: 'debit' | 'credit'
      ) =>
        postedJournalLines
          .filter((line: any) => predicate(line.account))
          .reduce((sum: number, line: any) => {
            const debit = toNumber(line.debitAmount);
            const credit = toNumber(line.creditAmount);

            return sum + (normalSide === 'debit' ? debit - credit : credit - debit);
          }, 0);

      const currentBalanceAllAccountsFromLedgers = calculateAccountBalance(isCashAccount, 'debit');
      const accountsReceivable = calculateAccountBalance(isReceivableAccount, 'debit');
      const accountsPayable = calculateAccountBalance(isPayableAccount, 'credit');
      const taxLiabilityEstimate = calculateAccountBalance(isTaxLiabilityAccount, 'credit');
      const totalCashOnHand =
        postedJournalLines.length > 0
          ? currentBalanceAllAccountsFromLedgers
          : transactionTotals.inflow - transactionTotals.outflow;
      const currentBalanceAllAccounts = totalCashOnHand;
      const unpostedEntriesCount = draftJournalEntries;
      const unpostedEntriesValue = draftJournalLines.reduce(
        (sum: number, line: any) => sum + toNumber(line.debitAmount),
        0
      );

      const cashFlowTrend = buildRollingMonthSeries(-5, 6).map((monthStart) => {
        const key = formatMonthKey(monthStart);
        const monthTransactions = transactions.filter(
          (transaction: any) => formatMonthKey(transaction.transactionDate) === key
        );
        const inflow = monthTransactions.reduce((sum: number, transaction: any) => {
          return getTransactionDirection(transaction.transactionType.name) === 'inflow'
            ? sum + toNumber(transaction.amount)
            : sum;
        }, 0);
        const outflow = monthTransactions.reduce((sum: number, transaction: any) => {
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
      const revenueVsExpense = cashFlowTrend.map((point) => ({
        key: point.key,
        label: point.label,
        revenue: point.inflow,
        expense: point.outflow
      }));
      const recentNetAverage =
        cashFlowTrend.length > 0
          ? cashFlowTrend.reduce((sum, point) => sum + point.net, 0) / cashFlowTrend.length
          : 0;
      const burnRate = recentNetAverage < 0 ? Math.abs(recentNetAverage) : null;
      const burnRunwayMonths =
        burnRate && burnRate > 0
          ? Math.max((currentBalanceAllAccounts ?? 0) / burnRate, 0)
          : null;
      const latestReconciliationEndDate =
        reconciliations.length > 0
          ? new Date(
              Math.max(
                ...reconciliations.map((reconciliation: any) =>
                  reconciliation.statementEndDate.getTime()
                )
              )
            )
          : null;
      const reconciliationOverdueDays = latestReconciliationEndDate
        ? daysDifference(latestReconciliationEndDate, generatedAt)
        : null;
      const topExpenseCategories = Array.from(
        transactionTotals.categoryTotals.entries()
      ) as Array<[string, number]>;
      const topExpenseCategoriesChart = topExpenseCategories
        .sort((left: [string, number], right: [string, number]) => right[1] - left[1])
        .slice(0, 5)
        .map(([category, value]: [string, number]) => ({
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
      const activeAccounts = accountingAccounts.filter((account: any) => account.isActive).length;
      const inactiveAccounts = Math.max(accountingAccounts.length - activeAccounts, 0);
      const metrics: FinanceOverviewMetrics = {
        totalTransactions,
        inflowTotal: transactionTotals.inflow,
        outflowTotal: transactionTotals.outflow,
        netCashFlow: transactionTotals.inflow - transactionTotals.outflow,
        currentBalanceAllAccounts,
        totalCashOnHand,
        accountsReceivable,
        accountsPayable,
        taxLiabilityEstimate:
          postedJournalLines.some((line: any) => isTaxLiabilityAccount(line.account))
            ? taxLiabilityEstimate
            : null,
        burnRate,
        burnRunwayMonths,
        reconciledTransactionsCount,
        postedJournalEntries,
        draftJournalEntries,
        unpostedEntriesCount,
        unpostedEntriesValue,
        openReconciliations,
        closedReconciliations,
        reconciliationGapTotal,
        averageMonthlyOutflow,
        reconciliationOverdueDays
      };

      return {
        module: this.module,
        enabled: true,
        status:
          totalTransactions === 0 &&
          journalEntries.length === 0 &&
          reconciliations.length === 0
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
          currentBalanceAllAccounts: roundMetric(currentBalanceAllAccounts),
          totalCashOnHand: roundMetric(totalCashOnHand),
          accountsReceivable: roundMetric(accountsReceivable),
          accountsPayable: roundMetric(accountsPayable),
          taxLiabilityEstimate: roundMetric(metrics.taxLiabilityEstimate),
          burnRate: roundMetric(burnRate),
          burnRunwayMonths: roundMetric(burnRunwayMonths, 2),
          budgetUtilizationRate: null,
          varianceToBudget: null,
          topDebtors: null,
          topCreditors: null,
          reconciledTransactionsCount,
          unreconciledTransactionsCount: Math.max(totalTransactions - reconciledTransactionsCount, 0),
          postedJournalEntries,
          draftJournalEntries,
          unpostedEntriesCount,
          unpostedEntriesValue: roundMetric(unpostedEntriesValue),
          openReconciliations,
          closedReconciliations,
          reconciliationGapTotal: roundMetric(reconciliationGapTotal),
          activeAccounts,
          inactiveAccounts,
          averageMonthlyOutflow: roundMetric(averageMonthlyOutflow)
        },
        charts: {
          cashFlowTrend,
          revenueVsExpense,
          cashBurnRunway: {
            currentBalance: roundMetric(currentBalanceAllAccounts),
            burnRate: roundMetric(burnRate),
            estimatedMonthsRemaining: roundMetric(burnRunwayMonths, 2)
          },
          topExpenseCategories: topExpenseCategoriesChart,
          journalEntriesByStatus,
          reconciliationsByStatus
        },
        insights: buildFinanceOverviewInsights(metrics, {
          supportsBudgeting: false,
          supportsCounterparties: false,
          supportsScheduledPayments: false
        })
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
