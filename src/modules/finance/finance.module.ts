import { FinanceController } from './finance.controller';
import { createFinanceRoutes } from './finance.routes';
import { FinanceService } from './finance.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';

export function createFinanceModule(_context: ModuleContext): ApplicationModule {
  const service = new FinanceService();
  const controller = new FinanceController(service);

  return {
    name: 'finance',
    version: '1.0.0',
    basePath: '/api/finance',
    requiresAccessKey: true,
    router: createFinanceRoutes(controller)
  };
}
