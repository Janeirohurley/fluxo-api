import { createAssetsModule } from './assets';
import { createEmployeesModule } from './employees';
import { createFinanceModule } from './finance';
import { createPayrollModule } from './payroll';
import { filterEnabledModules } from '../shared/modules/module-registry';
import { type ModuleContext } from '../shared/modules/module.types';

export function createModules(context: ModuleContext) {
  const modules = [
    createAssetsModule(context),
    createFinanceModule(context),
    createPayrollModule(context),
    createEmployeesModule(context)
  ];

  return filterEnabledModules(modules, context.env.ENABLED_MODULES);
}
