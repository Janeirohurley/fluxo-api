import { createOverviewRoutes } from './overview.routes';
import { OverviewController } from './overview.controller';
import { AssetsOverviewProvider } from './providers/assets-overview.provider';
import { FinanceOverviewProvider } from './providers/finance-overview.provider';
import { StaticOverviewProvider } from './providers/static-overview.provider';
import { OverviewService } from './overview.service';
import { type OverviewModuleName } from './overview.types';

export function createOverviewRouter(mountedModules: OverviewModuleName[]) {
  const overviewService = new OverviewService([
    new AssetsOverviewProvider(),
    new FinanceOverviewProvider(),
    new StaticOverviewProvider('employees'),
    new StaticOverviewProvider('payroll')
  ]);
  const overviewController = new OverviewController(overviewService, mountedModules);

  return createOverviewRoutes(overviewController);
}
