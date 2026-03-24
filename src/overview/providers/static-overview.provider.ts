import {
  type OverviewModuleName,
  type OverviewModuleResult,
  type OverviewProvider,
  type OverviewProviderContext
} from '../overview.types';

type StaticModuleDefinition = {
  description: string;
  boundaries: string[];
};

const MODULE_DEFINITIONS: Record<Exclude<OverviewModuleName, 'assets'>, StaticModuleDefinition> = {
  finance: {
    description: 'Cash-flow, income and expense tracking module scaffold',
    boundaries: ['transactions', 'accounts', 'journal-entries', 'reconciliations']
  },
  employees: {
    description: 'Human resources and personnel management module scaffold',
    boundaries: ['employees', 'roles', 'positions', 'assignments', 'contracts']
  },
  payroll: {
    description: 'Payroll and payslip module scaffold',
    boundaries: ['contracts', 'pay-slips', 'salary-components']
  }
};

export class StaticOverviewProvider implements OverviewProvider {
  constructor(public readonly module: Exclude<OverviewModuleName, 'assets'>) {}

  async build(context: OverviewProviderContext): Promise<OverviewModuleResult> {
    const definition = MODULE_DEFINITIONS[this.module];
    const isMounted = context.mountedModules.includes(this.module);
    const isEnabled = isMounted && context.accessSession.modules.includes(this.module);

    if (!isMounted) {
      return {
        module: this.module,
        enabled: false,
        status: 'unavailable',
        description: definition.description,
        boundaries: definition.boundaries,
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
        description: definition.description,
        boundaries: definition.boundaries,
        kpis: null,
        charts: null,
        insights: []
      };
    }

    return {
      module: this.module,
      enabled: true,
      status: 'not_implemented',
      description: definition.description,
      boundaries: definition.boundaries,
      kpis: null,
      charts: null,
      insights: [
        {
          code: `${this.module}_overview_pending`,
          severity: 'info',
          message: `The ${this.module} overview provider is not implemented yet.`
        }
      ]
    };
  }
}
