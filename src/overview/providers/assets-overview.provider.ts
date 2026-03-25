import {
  type OverviewChartPoint,
  type OverviewInsight,
  type OverviewModuleResult,
  type OverviewProvider,
  type OverviewProviderContext
} from '../overview.types';
import { type TenantDecimal } from '../../shared/tenant-prisma';

type AssetOverviewMetrics = {
  totalAssets: number;
  activeAssets: number;
  assetsInMaintenance: number;
  unavailableAssets: number;
  availabilityRate: number | null;
  assignedAssets: number;
  unassignedAssets: number;
  maintainedAssets: number;
  criticalMaintenanceCount: number;
  totalPurchaseValue: number;
  totalResidualValue: number;
  totalMaintenanceCost: number;
  averageMaintenanceCost: number;
  utilizationRate: number | null;
  maintenanceToAssetValueRatio: number | null;
};

type BasicAssetRow = {
  id: string;
  name: string;
  inventoryCode: string;
  createdAt: Date;
  statusId: string;
  categoryId: string;
};

type CurrentAssignmentRow = {
  assetId: string;
  locationId: string;
};

type MaintainedAssetRow = {
  assetId: string;
};

type FinanceRecordRow = {
  assetId: string;
  acquisitionDate: Date;
  purchaseValue: TenantDecimal;
  residualValue: TenantDecimal | null;
  estimatedLifeYears: number;
};

type MaintenanceRecordRow = {
  assetId: string;
  interventionCost: TenantDecimal | null;
  createdAt: Date;
};

type HighMaintenanceAsset = {
  assetId: string;
  assetName: string;
  maintenanceCost: number;
  purchaseValue: number;
};

function toNumber(value: TenantDecimal | null | undefined) {
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

function monthDifference(startDate: Date, endDate: Date) {
  return (
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth())
  );
}

function buildRollingMonthSeries(offsetFromCurrentMonth: number, months: number) {
  const today = new Date();
  const startMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offsetFromCurrentMonth, 1)
  );

  return Array.from({ length: months }, (_value, index) => addUtcMonths(startMonth, index));
}

export function buildAssetsOverviewInsights(
  metrics: AssetOverviewMetrics,
  options: {
    highMaintenanceAsset?: {
      assetName: string;
      maintenanceCost: number;
      purchaseValue: number;
    } | null;
  } = {}
): OverviewInsight[] {
  const insights: OverviewInsight[] = [];

  if (metrics.totalAssets === 0) {
    insights.push({
      code: 'assets_empty',
      severity: 'info',
      message: 'No assets have been registered yet.'
    });
    return insights;
  }

  if (metrics.utilizationRate !== null && metrics.utilizationRate < 0.6) {
    insights.push({
      code: 'assets_low_utilization',
      severity: 'warning',
      message: `${metrics.unassignedAssets} assets are currently unassigned.`,
      value: roundMetric(metrics.utilizationRate, 4)
    });
  }

  if (metrics.availabilityRate !== null && metrics.availabilityRate < 0.9) {
    insights.push({
      code: 'assets_low_availability',
      severity: 'critical',
      message: `${metrics.unavailableAssets} assets are currently unavailable.`,
      value: roundMetric(metrics.availabilityRate, 4)
    });
  }

  if (
    metrics.maintenanceToAssetValueRatio !== null &&
    metrics.maintenanceToAssetValueRatio >= 0.1
  ) {
    insights.push({
      code: 'assets_high_maintenance_ratio',
      severity: 'critical',
      message: 'Maintenance cost is high compared with the asset base value.',
      value: roundMetric(metrics.maintenanceToAssetValueRatio, 4)
    });
  } else if (
    metrics.maintenanceToAssetValueRatio !== null &&
    metrics.maintenanceToAssetValueRatio >= 0.05
  ) {
    insights.push({
      code: 'assets_maintenance_ratio_watch',
      severity: 'warning',
      message: 'Maintenance cost should be monitored against the asset base value.',
      value: roundMetric(metrics.maintenanceToAssetValueRatio, 4)
    });
  }

  if (
    metrics.totalAssets > 0 &&
    metrics.assetsInMaintenance / metrics.totalAssets >= 0.15
  ) {
    insights.push({
      code: 'assets_many_in_maintenance',
      severity: 'warning',
      message: `${metrics.assetsInMaintenance} assets are currently in maintenance status.`,
      value: metrics.assetsInMaintenance
    });
  }

  if (metrics.criticalMaintenanceCount > 0) {
    insights.push({
      code: 'assets_critical_maintenance',
      severity: metrics.criticalMaintenanceCount >= 5 ? 'critical' : 'warning',
      message: `${metrics.criticalMaintenanceCount} assets need close maintenance attention.`,
      value: metrics.criticalMaintenanceCount
    });
  }

  if (
    metrics.totalPurchaseValue > 0 &&
    metrics.totalResidualValue / metrics.totalPurchaseValue <= 0.2
  ) {
    insights.push({
      code: 'assets_low_residual_value',
      severity: 'info',
      message: 'The asset base residual value is low and may indicate a renewal need.',
      value: roundMetric(metrics.totalResidualValue / metrics.totalPurchaseValue, 4)
    });
  }

  if (options.highMaintenanceAsset) {
    insights.push({
      code: 'assets_high_maintenance_cost',
      severity: 'warning',
      message: `${options.highMaintenanceAsset.assetName} has already cost more in maintenance than its purchase value.`,
      value: roundMetric(
        options.highMaintenanceAsset.maintenanceCost / options.highMaintenanceAsset.purchaseValue,
        4
      )
    });
  }

  return insights;
}

export class AssetsOverviewProvider implements OverviewProvider {
  readonly module = 'assets' as const;

  async build(context: OverviewProviderContext): Promise<OverviewModuleResult> {
    const isMounted = context.mountedModules.includes(this.module);
    const isEnabled = isMounted && context.accessSession.modules.includes(this.module);

    if (!isMounted) {
      return {
        module: this.module,
        enabled: false,
        status: 'unavailable',
        description: 'Asset management overview',
        boundaries: ['assets', 'categories', 'statuses', 'finance-data', 'assignments', 'maintenance'],
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
        description: 'Asset management overview',
        boundaries: ['assets', 'categories', 'statuses', 'finance-data', 'assignments', 'maintenance'],
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
        description: 'Asset management overview',
        boundaries: ['assets', 'categories', 'statuses', 'finance-data', 'assignments', 'maintenance'],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'assets_overview_unavailable',
            severity: 'warning',
            message: 'Assets overview requires a configured database connection.'
          }
        ]
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAssets,
      statusDefinitions,
      categoryDefinitions,
      assetsBasic,
      currentAssignments,
      maintainedAssetRows,
      financeAggregate,
      maintenanceAggregate,
      financeRecords,
      maintenanceRecords
    ] = await context.prisma.$transaction([
      context.prisma.asset.count(),
      context.prisma.assetStatus.findMany({
        orderBy: { name: 'asc' }
      }),
      context.prisma.assetCategory.findMany({
        orderBy: { name: 'asc' }
      }),
      context.prisma.asset.findMany({
        select: {
          id: true,
          name: true,
          inventoryCode: true,
          createdAt: true,
          statusId: true,
          categoryId: true
        }
      }),
      context.prisma.assetAssignment.findMany({
        where: {
          OR: [{ endDate: null }, { endDate: { gte: today } }]
        },
        select: {
          assetId: true,
          locationId: true
        },
        distinct: ['assetId']
      }),
      context.prisma.maintenanceLog.findMany({
        distinct: ['assetId'],
        select: {
          assetId: true
        }
      }),
      context.prisma.assetFinanceData.aggregate({
        _sum: {
          purchaseValue: true,
          residualValue: true
        }
      }),
      context.prisma.maintenanceLog.aggregate({
        _sum: {
          interventionCost: true
        },
        _count: {
          id: true
        }
      }),
      context.prisma.assetFinanceData.findMany({
        select: {
          assetId: true,
          acquisitionDate: true,
          purchaseValue: true,
          residualValue: true,
          estimatedLifeYears: true
        }
      }),
      context.prisma.maintenanceLog.findMany({
        select: {
          assetId: true,
          interventionCost: true,
          createdAt: true
        }
      })
    ]);

    const statusCountById = assetsBasic.reduce<Map<string, number>>((result, asset: BasicAssetRow) => {
      result.set(asset.statusId, (result.get(asset.statusId) ?? 0) + 1);
      return result;
    }, new Map());
    const categoryCountById = assetsBasic.reduce<Map<string, number>>((result, asset: BasicAssetRow) => {
      result.set(asset.categoryId, (result.get(asset.categoryId) ?? 0) + 1);
      return result;
    }, new Map());

    const byStatus: OverviewChartPoint[] = statusDefinitions.map((status: { id: string; name: string }) => ({
      key: status.id,
      label: status.name,
      value: statusCountById.get(status.id) ?? 0
    }));
    const byCategory: OverviewChartPoint[] = categoryDefinitions
      .map((category: { id: string; name: string }) => ({
        key: category.id,
        label: category.name,
        value: categoryCountById.get(category.id) ?? 0
      }))
      .filter((item: OverviewChartPoint) => item.value > 0);
    const byLocation: OverviewChartPoint[] = (
      Array.from(
        currentAssignments.reduce<Map<string, number>>((result, assignment: CurrentAssignmentRow) => {
          result.set(assignment.locationId, (result.get(assignment.locationId) ?? 0) + 1);
          return result;
        }, new Map())
      ) as Array<[string, number]>
    ).map(([locationId, value]: [string, number]) => ({
      key: locationId,
      label: locationId,
      value
    }));

    const activeAssets =
      byStatus.find((entry) => entry.label.toLowerCase() === 'active')?.value ?? 0;
    const assetsInMaintenance =
      byStatus.find((entry) => entry.label.toLowerCase() === 'maintenance')?.value ?? 0;
    const inactiveAssets =
      byStatus.find((entry) => entry.label.toLowerCase() === 'inactive')?.value ?? 0;
    const disposedAssets =
      byStatus.find((entry) => entry.label.toLowerCase() === 'disposed')?.value ?? 0;
    const unavailableAssets = assetsInMaintenance + inactiveAssets + disposedAssets;
    const assignedAssets = currentAssignments.length;
    const unassignedAssets = Math.max(totalAssets - assignedAssets, 0);
    const totalPurchaseValue = toNumber(financeAggregate._sum.purchaseValue);
    const totalResidualValue = toNumber(financeAggregate._sum.residualValue);
    const totalMaintenanceCost = toNumber(maintenanceAggregate._sum.interventionCost);
    const maintainedAssets = maintainedAssetRows.length;
    const averageMaintenanceCost =
      maintainedAssets > 0 ? totalMaintenanceCost / maintainedAssets : 0;
    const maintenanceCostByAsset = maintenanceRecords.reduce<Map<string, number>>((result, record: MaintenanceRecordRow) => {
      result.set(record.assetId, (result.get(record.assetId) ?? 0) + toNumber(record.interventionCost));
      return result;
    }, new Map());
    const financeByAsset = financeRecords.reduce<
      Map<string, { purchaseValue: number; residualValue: number; estimatedLifeYears: number; acquisitionDate: Date }>
    >((result, record: FinanceRecordRow) => {
      result.set(record.assetId, {
        purchaseValue: toNumber(record.purchaseValue),
        residualValue: toNumber(record.residualValue),
        estimatedLifeYears: record.estimatedLifeYears,
        acquisitionDate: record.acquisitionDate
      });
      return result;
    }, new Map());
    const assetNameById = assetsBasic.reduce<Map<string, string>>((result, asset: BasicAssetRow) => {
      result.set(asset.id, asset.name);
      return result;
    }, new Map());

    const highMaintenanceAssets: HighMaintenanceAsset[] = (Array.from(
      maintenanceCostByAsset.entries()
    ) as Array<[string, number]>)
      .map(([assetId, maintenanceCost]: [string, number]) => {
        const finance = financeByAsset.get(assetId);

        return {
          assetId,
          assetName: assetNameById.get(assetId) ?? assetId,
          maintenanceCost,
          purchaseValue: finance?.purchaseValue ?? 0
        };
      })
      .filter(
        (entry: HighMaintenanceAsset) =>
          entry.purchaseValue > 0 && entry.maintenanceCost >= entry.purchaseValue
      )
      .sort((left: HighMaintenanceAsset, right: HighMaintenanceAsset) => right.maintenanceCost - left.maintenanceCost);
    const criticalMaintenanceCount = new Set([
      ...assetsBasic
        .filter((asset: BasicAssetRow) => {
          const statusName = statusDefinitions.find(
            (status: { id: string; name: string }) => status.id === asset.statusId
          )?.name;
          return statusName?.toLowerCase() === 'maintenance';
        })
        .map((asset: BasicAssetRow) => asset.id),
      ...highMaintenanceAssets.map((asset: HighMaintenanceAsset) => asset.assetId)
    ]).size;

    const acquisitionTrend = buildRollingMonthSeries(-11, 12).map((monthStart) => {
      const key = formatMonthKey(monthStart);
      const monthTotal = financeRecords.reduce((sum: number, record: FinanceRecordRow) => {
        return formatMonthKey(record.acquisitionDate) === key
          ? sum + toNumber(record.purchaseValue)
          : sum;
      }, 0);

      return {
        key,
        label: key,
        value: roundMetric(monthTotal) ?? 0
      };
    });

    const ageDistributionMap = financeRecords.reduce<Map<string, number>>((result, record: FinanceRecordRow) => {
      const lifeMonths = Math.max(record.estimatedLifeYears * 12, 1);
      const ageMonths = Math.max(monthDifference(record.acquisitionDate, new Date()), 0);
      const lifeRatio = ageMonths / lifeMonths;
      const bucket =
        lifeRatio <= 0.25 ? 'new' : lifeRatio <= 0.75 ? 'used' : 'end_of_life';

      result.set(bucket, (result.get(bucket) ?? 0) + 1);
      return result;
    }, new Map());
    const unknownAgeAssets = Math.max(totalAssets - financeRecords.length, 0);
    if (unknownAgeAssets > 0) {
      ageDistributionMap.set('unknown', unknownAgeAssets);
    }
    const ageDistribution: OverviewChartPoint[] = (Array.from(
      ageDistributionMap.entries()
    ) as Array<[string, number]>).map(
      ([bucket, value]: [string, number]) => ({
        key: bucket,
        label: bucket,
        value
      })
    );

    const depreciationForecast = buildRollingMonthSeries(0, 12).map((monthStart) => {
      const value = financeRecords.reduce((sum: number, record: FinanceRecordRow) => {
        const purchaseValue = toNumber(record.purchaseValue);
        const residualValue = toNumber(record.residualValue);
        const depreciationBase = Math.max(purchaseValue - residualValue, 0);
        const totalMonths = Math.max(record.estimatedLifeYears * 12, 1);
        const monthsElapsed = Math.min(
          Math.max(monthDifference(record.acquisitionDate, monthStart), 0),
          totalMonths
        );
        const monthlyDepreciation = depreciationBase / totalMonths;
        const netBookValue = Math.max(
          purchaseValue - monthlyDepreciation * monthsElapsed,
          residualValue
        );

        return sum + netBookValue;
      }, 0);

      return {
        key: formatMonthKey(monthStart),
        label: formatMonthKey(monthStart),
        value: roundMetric(value) ?? 0
      };
    });

    const recentAssets = [...assetsBasic]
      .sort((left: BasicAssetRow, right: BasicAssetRow) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 5)
      .map((asset: BasicAssetRow) => ({
        id: asset.id,
        name: asset.name,
        inventoryCode: asset.inventoryCode,
        createdAt: asset.createdAt.toISOString()
      }));

    const metrics: AssetOverviewMetrics = {
      totalAssets,
      activeAssets,
      assetsInMaintenance,
      unavailableAssets,
      availabilityRate: totalAssets > 0 ? (totalAssets - unavailableAssets) / totalAssets : null,
      assignedAssets,
      unassignedAssets,
      maintainedAssets,
      criticalMaintenanceCount,
      totalPurchaseValue,
      totalResidualValue,
      totalMaintenanceCost,
      averageMaintenanceCost,
      utilizationRate: totalAssets > 0 ? assignedAssets / totalAssets : null,
      maintenanceToAssetValueRatio:
        totalPurchaseValue > 0 ? totalMaintenanceCost / totalPurchaseValue : null
    };

    return {
      module: this.module,
      enabled: true,
      status: totalAssets === 0 ? 'empty' : 'ready',
      description: 'Asset management overview',
      boundaries: ['assets', 'categories', 'statuses', 'finance-data', 'assignments', 'maintenance'],
      kpis: {
        totalAssets,
        activeAssets,
        assignedAssets,
        unassignedAssets,
        assetsInMaintenance,
        unavailableAssets,
        criticalMaintenanceCount,
        maintainedAssets,
        totalPurchaseValue: roundMetric(totalPurchaseValue),
        totalResidualValue: roundMetric(totalResidualValue),
        totalMaintenanceCost: roundMetric(totalMaintenanceCost),
        averageMaintenanceCost: roundMetric(averageMaintenanceCost),
        availabilityRate: roundMetric(metrics.availabilityRate, 4),
        utilizationRate: roundMetric(metrics.utilizationRate, 4),
        maintenanceToAssetValueRatio: roundMetric(metrics.maintenanceToAssetValueRatio, 4)
      },
      charts: {
        byStatus,
        byCategory,
        byLocation,
        acquisitionTrend,
        depreciationForecast,
        ageDistribution,
        recentAssets
      },
      insights: buildAssetsOverviewInsights(metrics, {
        highMaintenanceAsset: highMaintenanceAssets[0] ?? null
      })
    };
  }
}
