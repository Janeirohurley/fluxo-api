import { createPayrollRoutes } from './payroll.routes';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';

export function createPayrollModule(_context: ModuleContext): ApplicationModule {
  const service = new PayrollService();
  const controller = new PayrollController(service);

  return {
    name: 'payroll',
    version: '1.0.0',
    basePath: '/api/payroll',
    requiresAccessKey: true,
    router: createPayrollRoutes(controller)
  };
}
