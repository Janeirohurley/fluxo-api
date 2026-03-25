import { createOverviewRoutes } from './overview.routes';
import { OverviewController } from './overview.controller';
import { AssetsOverviewProvider } from './providers/assets-overview.provider';
import { EmployeesOverviewProvider } from './providers/employees-overview.provider';
import { FinanceOverviewProvider } from './providers/finance-overview.provider';
import { PayrollOverviewProvider } from './providers/payroll-overview.provider';
import { OverviewService } from './overview.service';
import { type OverviewModuleName } from './overview.types';

export function createOverviewRouter(mountedModules: OverviewModuleName[]) {
  const overviewService = new OverviewService([
    new AssetsOverviewProvider(),
    new FinanceOverviewProvider(),
    new EmployeesOverviewProvider(),
    new PayrollOverviewProvider()
  ]);
  const overviewController = new OverviewController(overviewService, mountedModules);

  return createOverviewRoutes(overviewController);
}
