import { EmployeesController } from './employees.controller';
import { createEmployeesRoutes } from './employees.routes';
import { EmployeesService } from './employees.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';

export function createEmployeesModule(_context: ModuleContext): ApplicationModule {
  const service = new EmployeesService();
  const controller = new EmployeesController(service);

  return {
    name: 'employees',
    version: '1.0.0',
    basePath: '/api/employees',
    requiresAccessKey: true,
    router: createEmployeesRoutes(controller)
  };
}
