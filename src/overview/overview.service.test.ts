import assert from 'node:assert/strict';
import test from 'node:test';

import { OverviewService } from './overview.service';
import { type OverviewProvider } from './overview.types';

test('OverviewService composes providers into a progressive overview payload', async () => {
  const providers: OverviewProvider[] = [
    {
      module: 'assets',
      async build() {
        return {
          module: 'assets',
          enabled: true,
          status: 'ready',
          description: 'Assets overview',
          boundaries: ['assets'],
          kpis: {
            totalAssets: 10
          },
          charts: null,
          insights: [
            {
              code: 'assets_ok',
              severity: 'info',
              message: 'Assets overview ready'
            }
          ]
        };
      }
    },
    {
      module: 'finance',
      async build() {
        return {
          module: 'finance',
          enabled: false,
          status: 'disabled',
          description: 'Finance overview',
          boundaries: ['finance'],
          kpis: null,
          charts: null,
          insights: []
        };
      }
    },
    {
      module: 'employees',
      async build() {
        return {
          module: 'employees',
          enabled: false,
          status: 'disabled',
          description: 'Employees overview',
          boundaries: ['employees'],
          kpis: null,
          charts: null,
          insights: []
        };
      }
    },
    {
      module: 'payroll',
      async build() {
        return {
          module: 'payroll',
          enabled: false,
          status: 'disabled',
          description: 'Payroll overview',
          boundaries: ['payroll'],
          kpis: null,
          charts: null,
          insights: []
        };
      }
    }
  ];

  const service = new OverviewService(providers);
  const result = await service.buildOverview({
    prisma: null,
    generatedAt: '2026-03-24T00:00:00.000Z',
    mountedModules: ['assets', 'finance', 'employees', 'payroll'],
    accessSession: {
      keyId: '11111111-1111-1111-1111-111111111111',
      keyPrefix: 'flx_live_demo',
      label: 'demo',
      expiresAt: null,
      company: {
        id: '33333333-3333-3333-3333-333333333333',
        slug: 'demo-company',
        name: 'Demo Company'
      },
      plan: {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'assets-starter',
        name: 'Assets Starter',
        description: null
      },
      modules: ['assets']
    }
  });

  assert.equal(result.summary.activeModulesCount, 1);
  assert.equal(result.summary.readyModulesCount, 1);
  assert.equal(result.summary.insightsCount, 1);
  assert.equal(result.companyContext.company?.slug, 'demo-company');
  assert.equal(result.modules.assets.status, 'ready');
  assert.equal(result.modules.finance.status, 'disabled');
  assert.equal(result.crossModule.status, 'insufficient_modules');
});

test('OverviewService computes cross-module metrics when multiple ready modules are enabled', async () => {
  const providers: OverviewProvider[] = [
    {
      module: 'assets',
      async build() {
        return {
          module: 'assets',
          enabled: true,
          status: 'ready',
          description: 'Assets overview',
          boundaries: ['assets'],
          kpis: {
            totalAssets: 20,
            assignedAssets: 8,
            totalMaintenanceCost: 4000,
            totalPurchaseValue: 20000
          },
          charts: null,
          insights: []
        };
      }
    },
    {
      module: 'finance',
      async build() {
        return {
          module: 'finance',
          enabled: true,
          status: 'ready',
          description: 'Finance overview',
          boundaries: ['finance'],
          kpis: {
            outflowTotal: 10000,
            currentBalanceAllAccounts: 2500
          },
          charts: null,
          insights: []
        };
      }
    },
    {
      module: 'employees',
      async build() {
        return {
          module: 'employees',
          enabled: true,
          status: 'ready',
          description: 'Employees overview',
          boundaries: ['employees'],
          kpis: {
            activeEmployees: 5,
            employeesWithoutAssignment: 2
          },
          charts: null,
          insights: []
        };
      }
    },
    {
      module: 'payroll',
      async build() {
        return {
          module: 'payroll',
          enabled: true,
          status: 'ready',
          description: 'Payroll overview',
          boundaries: ['payroll'],
          kpis: {
            activeContracts: 4,
            netAmountTotal: 3000
          },
          charts: null,
          insights: []
        };
      }
    }
  ];

  const service = new OverviewService(providers);
  const result = await service.buildOverview({
    prisma: {
      maintenanceLog: {
        async findMany() {
          return [
            {
              createdAt: new Date('2026-02-15T00:00:00.000Z'),
              interventionCost: { toNumber: () => 500 }
            },
            {
              createdAt: new Date('2026-03-15T00:00:00.000Z'),
              interventionCost: { toNumber: () => 800 }
            }
          ];
        }
      },
      paySlip: {
        async findMany() {
          return [
            {
              paymentDate: new Date('2026-02-28T00:00:00.000Z'),
              payPeriodEnd: new Date('2026-02-28T00:00:00.000Z'),
              netAmount: { toNumber: () => 1200 },
              grossAmount: { toNumber: () => 1500 }
            },
            {
              paymentDate: new Date('2026-03-31T00:00:00.000Z'),
              payPeriodEnd: new Date('2026-03-31T00:00:00.000Z'),
              netAmount: { toNumber: () => 1800 },
              grossAmount: { toNumber: () => 2100 }
            }
          ];
        }
      }
    } as any,
    generatedAt: '2026-03-24T00:00:00.000Z',
    mountedModules: ['assets', 'finance', 'employees', 'payroll'],
    accessSession: {
      keyId: '11111111-1111-1111-1111-111111111111',
      keyPrefix: 'flx_live_demo',
      label: 'demo',
      expiresAt: null,
      company: {
        id: '33333333-3333-3333-3333-333333333333',
        slug: 'demo-company',
        name: 'Demo Company'
      },
      plan: {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'business-suite',
        name: 'Business Suite',
        description: null
      },
      modules: ['assets', 'finance', 'employees', 'payroll']
    }
  });

  assert.equal(result.crossModule.status, 'ready');
  assert.equal(result.crossModule.kpis?.assetsPerEmployee, 4);
  assert.equal(result.crossModule.kpis?.maintenanceToOutflowRatio, 0.4);
  assert.equal(result.crossModule.kpis?.payrollCashCoverage, 0.8333);
  assert.ok(Array.isArray((result.crossModule.charts as any)?.monthlyBusinessTrend));
  assert.ok(((result.crossModule.charts as any)?.monthlyBusinessTrend?.length ?? 0) > 0);
  assert.ok(
    result.crossModule.insights.some((insight) => insight.code === 'cross_payroll_cash_coverage_low')
  );
  assert.ok(result.summary.insightsCount >= result.crossModule.insights.length);
});
