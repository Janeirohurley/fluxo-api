import { EmployeesController } from './employees.controller';
import { InMemoryEmployeesRepository, PrismaEmployeesRepository } from './employees.repository';
import { createEmployeesRoutes } from './employees.routes';
import { EmployeesService } from './employees.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';
import { getRequiredTenantPrisma } from '../../shared/tenancy';

export function createEmployeesModule(context: ModuleContext): ApplicationModule {
  const repository =
    context.prisma && context.env.EMPLOYEES_STORAGE !== 'memory'
      ? new PrismaEmployeesRepository(() => getRequiredTenantPrisma())
      : new InMemoryEmployeesRepository();
  const service = new EmployeesService(repository);
  const controller = new EmployeesController(service);

  return {
    name: 'employees',
    version: '1.0.0',
    basePath: '/api/employees',
    requiresAccessKey: true,
    router: createEmployeesRoutes(controller)
  };
}
