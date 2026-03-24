import { FinanceController } from './finance.controller';
import { InMemoryFinanceRepository, PrismaFinanceRepository } from './finance.repository';
import { createFinanceRoutes } from './finance.routes';
import { FinanceService } from './finance.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';
import { getRequiredTenantPrisma } from '../../shared/tenancy';

export function createFinanceModule(context: ModuleContext): ApplicationModule {
  const repository =
    context.prisma && context.env.FINANCE_STORAGE !== 'memory'
      ? new PrismaFinanceRepository(() => getRequiredTenantPrisma())
      : new InMemoryFinanceRepository();
  const service = new FinanceService(repository);
  const controller = new FinanceController(service);

  return {
    name: 'finance',
    version: '1.0.0',
    basePath: '/api/finance',
    requiresAccessKey: true,
    router: createFinanceRoutes(controller)
  };
}
