import {
  type OverviewInsight,
  type OverviewModuleName,
  type OverviewProvider,
  type OverviewProviderContext,
  type OverviewResponse
} from './overview.types';

function readNumber(source: Record<string, unknown> | null | undefined, key: string) {
  const value = source?.[key];
  return typeof value === 'number' ? value : null;
}

function roundMetric(value: number | null, digits = 2) {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function readChartArray<T = Record<string, unknown>>(
  source: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = source?.[key];
  return Array.isArray(value) ? (value as T[]) : null;
}

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function buildRollingMonthKeys(baseDate: string, months: number) {
  const today = new Date(baseDate);
  const startMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1)
  );

  return Array.from({ length: months }, (_value, index) => formatMonthKey(addUtcMonths(startMonth, index)));
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

async function buildCrossModuleOverview(
  context: OverviewProviderContext,
  modules: OverviewResponse['modules']
) {
  const combinableModules = Object.values(modules).filter((moduleResult) =>
    ['ready', 'empty'].includes(moduleResult.status)
  );

  if (combinableModules.length < 2) {
    return {
      enabled: true,
      status: 'empty' as const,
      kpis: null,
      charts: null,
      insights: []
    };
  }

  const insights: OverviewInsight[] = [];
  const kpis: Record<string, unknown> = {};

  const assets = modules.assets;
  const finance = modules.finance;
  const employees = modules.employees;
  const payroll = modules.payroll;
  const financeCashFlowTrend = readChartArray<{
    key: string;
    label: string;
    inflow?: number;
    outflow?: number;
    net?: number;
  }>(finance.charts, 'cashFlowTrend');

  let charts: Record<string, unknown> | null = null;

  if (assets.enabled && employees.enabled) {
    const totalAssets = readNumber(assets.kpis, 'totalAssets');
    const activeEmployees = readNumber(employees.kpis, 'activeEmployees');
    const assignedAssets = readNumber(assets.kpis, 'assignedAssets');
    const employeesWithoutAssignment = readNumber(employees.kpis, 'employeesWithoutAssignment');

    if (totalAssets !== null && activeEmployees !== null && activeEmployees > 0) {
      const assetsPerEmployee = totalAssets / activeEmployees;
      kpis.assetsPerEmployee = roundMetric(assetsPerEmployee, 4);

      if (assetsPerEmployee > 5) {
        insights.push({
          code: 'cross_assets_per_employee_high',
          severity: 'info',
          message: 'The asset base is high compared with the active workforce.',
          value: roundMetric(assetsPerEmployee, 4)
        });
      }
    }

    if (
      assignedAssets !== null &&
      activeEmployees !== null &&
      activeEmployees > 0
    ) {
      const assignedAssetCoverageRate = assignedAssets / activeEmployees;
      kpis.assignedAssetCoverageRate = roundMetric(assignedAssetCoverageRate, 4);

      if (assignedAssetCoverageRate < 0.5) {
        insights.push({
          code: 'cross_low_asset_coverage',
          severity: 'warning',
          message: 'Assigned assets cover less than half of the active workforce.',
          value: roundMetric(assignedAssetCoverageRate, 4)
        });
      }
    }

    if (employeesWithoutAssignment !== null && employeesWithoutAssignment > 0) {
      insights.push({
        code: 'cross_employees_without_assignment',
        severity: employeesWithoutAssignment >= 5 ? 'warning' : 'info',
        message: `${employeesWithoutAssignment} employees do not currently have a recorded assignment.`,
        value: employeesWithoutAssignment
      });
    }
  }

  if (assets.enabled && finance.enabled) {
    const totalMaintenanceCost = readNumber(assets.kpis, 'totalMaintenanceCost');
    const outflowTotal = readNumber(finance.kpis, 'outflowTotal');
    const totalPurchaseValue = readNumber(assets.kpis, 'totalPurchaseValue');

    if (totalMaintenanceCost !== null && outflowTotal !== null && outflowTotal > 0) {
      const maintenanceToOutflowRatio = totalMaintenanceCost / outflowTotal;
      kpis.maintenanceToOutflowRatio = roundMetric(maintenanceToOutflowRatio, 4);

      if (maintenanceToOutflowRatio >= 0.2) {
        insights.push({
          code: 'cross_high_maintenance_vs_outflow',
          severity: maintenanceToOutflowRatio >= 0.35 ? 'warning' : 'info',
          message: 'Asset maintenance consumes a significant share of finance outflows.',
          value: roundMetric(maintenanceToOutflowRatio, 4)
        });
      }
    }

    if (
      totalMaintenanceCost !== null &&
      totalPurchaseValue !== null &&
      totalPurchaseValue > 0
    ) {
      kpis.maintenanceToAssetBaseRatio = roundMetric(
        totalMaintenanceCost / totalPurchaseValue,
        4
      );
    }
  }

  if (payroll.enabled && finance.enabled) {
    const netAmountTotal = readNumber(payroll.kpis, 'netAmountTotal');
    const outflowTotal = readNumber(finance.kpis, 'outflowTotal');
    const currentBalanceAllAccounts = readNumber(finance.kpis, 'currentBalanceAllAccounts');

    if (netAmountTotal !== null && outflowTotal !== null && outflowTotal > 0) {
      const payrollToOutflowRatio = netAmountTotal / outflowTotal;
      kpis.payrollToOutflowRatio = roundMetric(payrollToOutflowRatio, 4);

      if (payrollToOutflowRatio >= 0.4) {
        insights.push({
          code: 'cross_payroll_cost_weight',
          severity: payrollToOutflowRatio >= 0.6 ? 'warning' : 'info',
          message: 'Payroll represents a major share of current finance outflows.',
          value: roundMetric(payrollToOutflowRatio, 4)
        });
      }
    }

    if (
      netAmountTotal !== null &&
      currentBalanceAllAccounts !== null &&
      currentBalanceAllAccounts > 0
    ) {
      const payrollCashCoverage = currentBalanceAllAccounts / netAmountTotal;
      kpis.payrollCashCoverage = roundMetric(payrollCashCoverage, 4);

      if (payrollCashCoverage < 1) {
        insights.push({
          code: 'cross_payroll_cash_coverage_low',
          severity: 'critical',
          message: 'Current available cash does not fully cover the payroll net amount tracked so far.',
          value: roundMetric(payrollCashCoverage, 4)
        });
      }
    }
  }

  if (assets.enabled && payroll.enabled && finance.enabled) {
    const totalMaintenanceCost = readNumber(assets.kpis, 'totalMaintenanceCost');
    const netAmountTotal = readNumber(payroll.kpis, 'netAmountTotal');
    const outflowTotal = readNumber(finance.kpis, 'outflowTotal');
    const currentBalanceAllAccounts = readNumber(finance.kpis, 'currentBalanceAllAccounts');

    if (totalMaintenanceCost !== null && netAmountTotal !== null) {
      const combinedOperatingCost = totalMaintenanceCost + netAmountTotal;
      kpis.combinedOperatingCost = roundMetric(combinedOperatingCost);

      if (netAmountTotal > 0) {
        kpis.maintenanceToPayrollRatio = roundMetric(totalMaintenanceCost / netAmountTotal, 4);
      }

      if (outflowTotal !== null && outflowTotal > 0) {
        const combinedOperatingCostToOutflowRatio = combinedOperatingCost / outflowTotal;
        kpis.combinedOperatingCostToOutflowRatio = roundMetric(
          combinedOperatingCostToOutflowRatio,
          4
        );

        if (combinedOperatingCostToOutflowRatio >= 0.7) {
          insights.push({
            code: 'cross_operating_cost_pressure_high',
            severity: combinedOperatingCostToOutflowRatio >= 0.9 ? 'critical' : 'warning',
            message: 'Payroll and asset maintenance together consume a large share of finance outflows.',
            value: roundMetric(combinedOperatingCostToOutflowRatio, 4)
          });
        }
      }

      if (currentBalanceAllAccounts !== null && combinedOperatingCost > 0) {
        const combinedCashCoverage = currentBalanceAllAccounts / combinedOperatingCost;
        kpis.combinedCashCoverage = roundMetric(combinedCashCoverage, 4);

        if (combinedCashCoverage < 1) {
          insights.push({
            code: 'cross_combined_cash_coverage_low',
            severity: combinedCashCoverage < 0.75 ? 'critical' : 'warning',
            message:
              'Current available cash does not fully cover combined payroll and maintenance pressure.',
            value: roundMetric(combinedCashCoverage, 4)
          });
        }
      }
    }
  }

  if (payroll.enabled && employees.enabled) {
    const netAmountTotal = readNumber(payroll.kpis, 'netAmountTotal');
    const activeEmployees = readNumber(employees.kpis, 'activeEmployees');
    const activeContracts = readNumber(payroll.kpis, 'activeContracts');

    if (netAmountTotal !== null && activeEmployees !== null && activeEmployees > 0) {
      kpis.averagePayrollPerActiveEmployee = roundMetric(netAmountTotal / activeEmployees, 2);
    }

    if (activeContracts !== null && activeEmployees !== null && activeEmployees > 0) {
      const contractCoverage = activeContracts / activeEmployees;
      kpis.payrollContractCoverage = roundMetric(contractCoverage, 4);

      if (contractCoverage < 0.8) {
        insights.push({
          code: 'cross_payroll_contract_coverage_low',
          severity: 'warning',
          message: 'The number of active payroll contracts is low compared with active employees.',
          value: roundMetric(contractCoverage, 4)
        });
      }
    }
  }

  if (
    context.prisma &&
    (assets.enabled || payroll.enabled || finance.enabled)
  ) {
    const monthKeys =
      financeCashFlowTrend?.map((point) => point.key) ??
      buildRollingMonthKeys(context.generatedAt, 6);
    const monthKeySet = new Set(monthKeys);
    const prisma = context.prisma as any;

    const [maintenanceLogs, paySlips] = await Promise.all([
      assets.enabled
        ? prisma.maintenanceLog.findMany({
            select: {
              createdAt: true,
              interventionCost: true
            }
          })
        : Promise.resolve([]),
      payroll.enabled
        ? prisma.paySlip.findMany({
            where: {
              status: {
                not: 'cancelled'
              }
            },
            select: {
              paymentDate: true,
              payPeriodEnd: true,
              netAmount: true,
              grossAmount: true
            }
          })
        : Promise.resolve([])
    ]);

    const maintenanceByMonth = new Map<string, number>();
    for (const log of maintenanceLogs) {
      const key = formatMonthKey(log.createdAt);
      if (!monthKeySet.has(key)) {
        continue;
      }

      const cost =
        typeof log.interventionCost?.toNumber === 'function'
          ? log.interventionCost.toNumber()
          : Number(log.interventionCost ?? 0);
      maintenanceByMonth.set(key, (maintenanceByMonth.get(key) ?? 0) + cost);
    }

    const payrollByMonth = new Map<string, { net: number; gross: number }>();
    for (const paySlip of paySlips) {
      const date = paySlip.paymentDate ?? paySlip.payPeriodEnd;
      const key = formatMonthKey(date);
      if (!monthKeySet.has(key)) {
        continue;
      }

      const current = payrollByMonth.get(key) ?? { net: 0, gross: 0 };
      const netAmount =
        typeof paySlip.netAmount?.toNumber === 'function'
          ? paySlip.netAmount.toNumber()
          : Number(paySlip.netAmount ?? 0);
      const grossAmount =
        typeof paySlip.grossAmount?.toNumber === 'function'
          ? paySlip.grossAmount.toNumber()
          : Number(paySlip.grossAmount ?? 0);

      payrollByMonth.set(key, {
        net: current.net + netAmount,
        gross: current.gross + grossAmount
      });
    }

    const financeByMonth = new Map(
      (financeCashFlowTrend ?? []).map((point) => [
        point.key,
        {
          inflow: point.inflow ?? 0,
          outflow: point.outflow ?? 0,
          net: point.net ?? 0
        }
      ])
    );

    const monthlyBusinessTrend = monthKeys.map((key) => {
      const financePoint = financeByMonth.get(key) ?? { inflow: 0, outflow: 0, net: 0 };
      const maintenance = maintenanceByMonth.get(key) ?? 0;
      const payrollPoint = payrollByMonth.get(key) ?? { net: 0, gross: 0 };
      const combinedOperatingCost = maintenance + payrollPoint.net;
      const operatingPressure =
        financePoint.outflow > 0 ? combinedOperatingCost / financePoint.outflow : null;

      return {
        key,
        label: key,
        inflow: roundMetric(financePoint.inflow) ?? 0,
        outflow: roundMetric(financePoint.outflow) ?? 0,
        netCashFlow: roundMetric(financePoint.net) ?? 0,
        maintenance: roundMetric(maintenance) ?? 0,
        payroll: roundMetric(payrollPoint.net) ?? 0,
        payrollGross: roundMetric(payrollPoint.gross) ?? 0,
        combinedOperatingCost: roundMetric(combinedOperatingCost) ?? 0,
        operatingPressure: roundMetric(operatingPressure, 4)
      };
    });

    const recentWindow = monthlyBusinessTrend.slice(-3);
    const previousWindow = monthlyBusinessTrend.slice(0, Math.max(monthlyBusinessTrend.length - 3, 0));
    const recentOperatingAverage = average(recentWindow.map((point) => point.combinedOperatingCost));
    const previousOperatingAverage = average(previousWindow.map((point) => point.combinedOperatingCost));
    const recentNetAverage = average(recentWindow.map((point) => point.netCashFlow));
    const previousNetAverage = average(previousWindow.map((point) => point.netCashFlow));
    const latestPoint = monthlyBusinessTrend.at(-1) ?? null;

    kpis.recentOperatingCostAverage = roundMetric(recentOperatingAverage);
    kpis.recentNetCashFlowAverage = roundMetric(recentNetAverage);

    charts = {
      monthlyBusinessTrend,
      monthlyPressureTrend: monthlyBusinessTrend.map((point) => ({
        key: point.key,
        label: point.label,
        operatingPressure: point.operatingPressure,
        netCashFlow: point.netCashFlow
      }))
    };

    if (
      recentWindow.length >= 2 &&
      previousWindow.length >= 2 &&
      previousOperatingAverage > 0 &&
      recentOperatingAverage > previousOperatingAverage * 1.15 &&
      recentNetAverage < previousNetAverage
    ) {
      insights.push({
        code: 'cross_business_pressure_rising',
        severity: recentNetAverage < 0 ? 'critical' : 'warning',
        message:
          'Combined payroll and maintenance pressure is rising while recent cash performance is weakening.',
        value: roundMetric(recentOperatingAverage / previousOperatingAverage, 4)
      });
    }

    if (latestPoint && latestPoint.operatingPressure !== null && latestPoint.operatingPressure >= 0.8) {
      insights.push({
        code: 'cross_latest_month_pressure_high',
        severity: latestPoint.operatingPressure >= 1 ? 'critical' : 'warning',
        message: 'The latest month shows strong operating pressure from payroll and maintenance.',
        value: latestPoint.operatingPressure
      });
    }
  }

  return {
    enabled: true,
    status: Object.keys(kpis).length > 0 || insights.length > 0 ? ('ready' as const) : ('empty' as const),
    kpis: Object.keys(kpis).length > 0 ? kpis : null,
    charts,
    insights
  };
}

export class OverviewService {
  constructor(private readonly providers: OverviewProvider[]) {}

  async buildOverview(context: OverviewProviderContext): Promise<OverviewResponse> {
    const moduleResults = await Promise.all(this.providers.map((provider) => provider.build(context)));
    const modules = Object.fromEntries(
      moduleResults.map((moduleResult) => [moduleResult.module, moduleResult])
    ) as OverviewResponse['modules'];
    const activeModulesCount = moduleResults.filter((moduleResult) => moduleResult.enabled).length;
    const readyModulesCount = moduleResults.filter((moduleResult) =>
      ['ready', 'empty'].includes(moduleResult.status)
    ).length;
    const crossModule = activeModulesCount > 1
      ? await buildCrossModuleOverview(context, modules)
      : {
          enabled: false,
          status: 'insufficient_modules' as const,
          kpis: null,
          charts: null,
          insights: []
        };
    const allInsights = [
      ...moduleResults.flatMap((moduleResult) => moduleResult.insights),
      ...crossModule.insights
    ];

    return {
      generatedAt: context.generatedAt,
      companyContext: {
        company: context.accessSession.company,
        accessKey: {
          keyId: context.accessSession.keyId,
          keyPrefix: context.accessSession.keyPrefix,
          label: context.accessSession.label,
          planCode: context.accessSession.plan.code,
          planName: context.accessSession.plan.name
        },
        enabledModules: [...context.accessSession.modules] as OverviewModuleName[],
        mountedModules: [...context.mountedModules]
      },
      summary: {
        activeModulesCount,
        readyModulesCount,
        insightsCount: allInsights.length,
        criticalInsightsCount: allInsights.filter((insight) => insight.severity === 'critical').length
      },
      modules,
      crossModule
    };
  }
}
