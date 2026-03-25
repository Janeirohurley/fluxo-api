import { PayrollController } from './payroll.controller';
import { InMemoryPayrollRepository, PrismaPayrollRepository } from './payroll.repository';
import { createPayrollRoutes } from './payroll.routes';
import { PayrollService } from './payroll.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';
import { getRequiredTenantPrisma } from '../../shared/tenancy';

export function createPayrollModule(context: ModuleContext): ApplicationModule {
  const repository =
    context.prisma && context.env.PAYROLL_STORAGE !== 'memory'
      ? new PrismaPayrollRepository(() => getRequiredTenantPrisma())
      : new InMemoryPayrollRepository();
  const service = new PayrollService(repository);
  const controller = new PayrollController(service);

  return {
    name: 'payroll',
    version: '1.0.0',
    basePath: '/api/payroll',
    requiresAccessKey: true,
    router: createPayrollRoutes(controller)
  };
}
