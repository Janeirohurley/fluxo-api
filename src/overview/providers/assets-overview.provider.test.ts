import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAssetsOverviewInsights } from './assets-overview.provider';

test('buildAssetsOverviewInsights returns an empty-state insight when there are no assets', () => {
  const insights = buildAssetsOverviewInsights({
    totalAssets: 0,
    activeAssets: 0,
    assetsInMaintenance: 0,
    unavailableAssets: 0,
    availabilityRate: null,
    assignedAssets: 0,
    unassignedAssets: 0,
    maintainedAssets: 0,
    criticalMaintenanceCount: 0,
    totalPurchaseValue: 0,
    totalResidualValue: 0,
    totalMaintenanceCost: 0,
    averageMaintenanceCost: 0,
    utilizationRate: null,
    maintenanceToAssetValueRatio: null
  });

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.code, 'assets_empty');
});

test('buildAssetsOverviewInsights flags low utilization and high maintenance ratios', () => {
  const insights = buildAssetsOverviewInsights({
    totalAssets: 20,
    activeAssets: 8,
    assetsInMaintenance: 4,
    unavailableAssets: 5,
    availabilityRate: 0.75,
    assignedAssets: 9,
    unassignedAssets: 11,
    maintainedAssets: 5,
    criticalMaintenanceCount: 3,
    totalPurchaseValue: 1000,
    totalResidualValue: 100,
    totalMaintenanceCost: 120,
    averageMaintenanceCost: 24,
    utilizationRate: 0.45,
    maintenanceToAssetValueRatio: 0.12
  });

  assert.ok(insights.some((insight) => insight.code === 'assets_low_utilization'));
  assert.ok(insights.some((insight) => insight.code === 'assets_low_availability'));
  assert.ok(insights.some((insight) => insight.code === 'assets_high_maintenance_ratio'));
  assert.ok(insights.some((insight) => insight.code === 'assets_many_in_maintenance'));
  assert.ok(insights.some((insight) => insight.code === 'assets_critical_maintenance'));
});

test('buildAssetsOverviewInsights flags assets whose maintenance cost exceeds purchase value', () => {
  const insights = buildAssetsOverviewInsights(
    {
      totalAssets: 8,
      activeAssets: 6,
      assetsInMaintenance: 1,
      unavailableAssets: 1,
      availabilityRate: 0.875,
      assignedAssets: 6,
      unassignedAssets: 2,
      maintainedAssets: 3,
      criticalMaintenanceCount: 1,
      totalPurchaseValue: 5000,
      totalResidualValue: 2200,
      totalMaintenanceCost: 1700,
      averageMaintenanceCost: 566.67,
      utilizationRate: 0.75,
      maintenanceToAssetValueRatio: 0.34
    },
    {
      highMaintenanceAsset: {
        assetName: 'Laptop Dell 7420',
        maintenanceCost: 1400,
        purchaseValue: 1200
      }
    }
  );

  assert.ok(insights.some((insight) => insight.code === 'assets_high_maintenance_cost'));
});
