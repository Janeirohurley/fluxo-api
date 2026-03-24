import { type PrismaClientLike } from '../shared/prisma';
import { type AccessSession } from '../shared/access/access.types';

export type OverviewModuleName = 'assets' | 'finance' | 'employees' | 'payroll';
export type OverviewModuleStatus =
  | 'disabled'
  | 'ready'
  | 'empty'
  | 'not_implemented'
  | 'unavailable';
export type OverviewInsightSeverity = 'info' | 'warning' | 'critical';

export type OverviewInsight = {
  code: string;
  severity: OverviewInsightSeverity;
  message: string;
  value?: number | string | null;
};

export type OverviewChartPoint = {
  key: string;
  label: string;
  value: number;
};

export type OverviewModuleResult = {
  module: OverviewModuleName;
  enabled: boolean;
  status: OverviewModuleStatus;
  description: string;
  boundaries: string[];
  kpis: Record<string, unknown> | null;
  charts: Record<string, unknown> | null;
  insights: OverviewInsight[];
};

export type OverviewProviderContext = {
  prisma: PrismaClientLike | null;
  accessSession: AccessSession;
  mountedModules: OverviewModuleName[];
  generatedAt: string;
};

export type OverviewProvider = {
  module: OverviewModuleName;
  build(context: OverviewProviderContext): Promise<OverviewModuleResult>;
};

export type OverviewResponse = {
  generatedAt: string;
  companyContext: {
    accessKey: {
      keyId: string;
      keyPrefix: string;
      label: string | null;
      planCode: string;
      planName: string;
    };
    enabledModules: OverviewModuleName[];
    mountedModules: OverviewModuleName[];
  };
  summary: {
    activeModulesCount: number;
    readyModulesCount: number;
    insightsCount: number;
    criticalInsightsCount: number;
  };
  modules: Record<OverviewModuleName, OverviewModuleResult>;
  crossModule: {
    enabled: boolean;
    status: 'insufficient_modules' | 'not_implemented';
    kpis: Record<string, unknown> | null;
    insights: OverviewInsight[];
  };
};
