import { type OverviewInsight, type OverviewModuleResult, type OverviewProvider, type OverviewProviderContext } from '../overview.types';
import { type TenantDecimal } from '../../shared/tenant-prisma';

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

export function buildPayrollInsights(metrics: {
  totalPaySlips: number;
  draftPaySlips: number;
  issuedPaySlips: number;
  paidPaySlips: number;
  activeContracts: number;
}) {
  const insights: OverviewInsight[] = [];

  if (metrics.totalPaySlips === 0) {
    insights.push({
      code: 'payroll_empty',
      severity: 'info',
      message: 'No payslip has been created yet.'
    });
    return insights;
  }

  if (metrics.draftPaySlips > 0) {
    insights.push({
      code: 'payroll_drafts_pending',
      severity: metrics.draftPaySlips >= 5 ? 'warning' : 'info',
      message: `${metrics.draftPaySlips} payslips are still in draft status.`,
      value: metrics.draftPaySlips
    });
  }

  if (metrics.issuedPaySlips > 0) {
    insights.push({
      code: 'payroll_issued_pending_payment',
      severity: metrics.issuedPaySlips >= 5 ? 'warning' : 'info',
      message: `${metrics.issuedPaySlips} issued payslips are waiting for payment.`,
      value: metrics.issuedPaySlips
    });
  }

  if (metrics.activeContracts > 0 && metrics.paidPaySlips === 0) {
    insights.push({
      code: 'payroll_no_paid_payslips',
      severity: 'warning',
      message: 'Active contracts exist but no payslip has been marked as paid yet.',
      value: metrics.activeContracts
    });
  }

  return insights;
}

export class PayrollOverviewProvider implements OverviewProvider {
  readonly module = 'payroll' as const;

  async build(context: OverviewProviderContext): Promise<OverviewModuleResult> {
    const isMounted = context.mountedModules.includes(this.module);
    const isEnabled = isMounted && context.accessSession.modules.includes(this.module);

    if (!isMounted) {
      return {
        module: this.module,
        enabled: false,
        status: 'unavailable',
        description: 'Payroll and payslip lifecycle overview',
        boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
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
        description: 'Payroll and payslip lifecycle overview',
        boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
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
        description: 'Payroll and payslip lifecycle overview',
        boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'payroll_overview_unavailable',
            severity: 'warning',
            message: 'Payroll overview requires a configured tenant database connection.'
          }
        ]
      };
    }

    try {
      const prisma = context.prisma as any;
      const [activeContracts, paySlips] = await prisma.$transaction([
        prisma.employeeContract.count({
          where: { status: 'active' }
        }),
        prisma.paySlip.findMany({
          include: {
            employee: true,
            contract: {
              include: {
                employee: true
              }
            },
            lines: true
          }
        })
      ]);

      const metrics = {
        activeContracts,
        totalPaySlips: paySlips.length,
        draftPaySlips: paySlips.filter((paySlip: any) => paySlip.status === 'draft').length,
        issuedPaySlips: paySlips.filter((paySlip: any) => paySlip.status === 'issued').length,
        paidPaySlips: paySlips.filter((paySlip: any) => paySlip.status === 'paid').length,
        cancelledPaySlips: paySlips.filter((paySlip: any) => paySlip.status === 'cancelled').length,
        grossAmountTotal: paySlips.reduce(
          (sum: number, paySlip: any) => sum + toNumber(paySlip.grossAmount),
          0
        ),
        netAmountTotal: paySlips.reduce(
          (sum: number, paySlip: any) => sum + toNumber(paySlip.netAmount),
          0
        )
      };

      return {
        module: this.module,
        enabled: true,
        status: metrics.totalPaySlips === 0 ? 'empty' : 'ready',
        description: 'Payroll and payslip lifecycle overview',
        boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
        kpis: {
          activeContracts: metrics.activeContracts,
          totalPaySlips: metrics.totalPaySlips,
          draftPaySlips: metrics.draftPaySlips,
          issuedPaySlips: metrics.issuedPaySlips,
          paidPaySlips: metrics.paidPaySlips,
          cancelledPaySlips: metrics.cancelledPaySlips,
          grossAmountTotal: roundMetric(metrics.grossAmountTotal),
          netAmountTotal: roundMetric(metrics.netAmountTotal)
        },
        charts: {
          payslipsByStatus: [
            { key: 'draft', label: 'draft', value: metrics.draftPaySlips },
            { key: 'issued', label: 'issued', value: metrics.issuedPaySlips },
            { key: 'paid', label: 'paid', value: metrics.paidPaySlips },
            { key: 'cancelled', label: 'cancelled', value: metrics.cancelledPaySlips }
          ],
          recentPaySlips: paySlips
            .slice()
            .sort(
              (left: any, right: any) =>
                right.createdAt.getTime() - left.createdAt.getTime()
            )
            .slice(0, 5)
            .map((paySlip: any) => ({
              id: paySlip.id,
              employeeName: `${paySlip.employee.firstName} ${paySlip.employee.lastName}`,
              payPeriodStart: paySlip.payPeriodStart.toISOString().slice(0, 10),
              payPeriodEnd: paySlip.payPeriodEnd.toISOString().slice(0, 10),
              status: paySlip.status,
              netAmount: roundMetric(toNumber(paySlip.netAmount))
            }))
        },
        insights: buildPayrollInsights(metrics)
      };
    } catch (error) {
      return {
        module: this.module,
        enabled: true,
        status: 'unavailable',
        description: 'Payroll and payslip lifecycle overview',
        boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'payroll_overview_query_failed',
            severity: 'warning',
            message: error instanceof Error ? error.message : 'Payroll overview query failed.'
          }
        ]
      };
    }
  }
}
