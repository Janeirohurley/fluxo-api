import {
  type OverviewModuleName,
  type OverviewProvider,
  type OverviewProviderContext,
  type OverviewResponse
} from './overview.types';

export class OverviewService {
  constructor(private readonly providers: OverviewProvider[]) {}

  async buildOverview(context: OverviewProviderContext): Promise<OverviewResponse> {
    const moduleResults = await Promise.all(this.providers.map((provider) => provider.build(context)));
    const modules = Object.fromEntries(
      moduleResults.map((moduleResult) => [moduleResult.module, moduleResult])
    ) as OverviewResponse['modules'];
    const allInsights = moduleResults.flatMap((moduleResult) => moduleResult.insights);
    const activeModulesCount = moduleResults.filter((moduleResult) => moduleResult.enabled).length;
    const readyModulesCount = moduleResults.filter((moduleResult) =>
      ['ready', 'empty'].includes(moduleResult.status)
    ).length;

    return {
      generatedAt: context.generatedAt,
      companyContext: {
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
      crossModule: {
        enabled: activeModulesCount > 1,
        status: activeModulesCount > 1 ? 'not_implemented' : 'insufficient_modules',
        kpis: null,
        insights: []
      }
    };
  }
}
