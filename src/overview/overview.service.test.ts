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
