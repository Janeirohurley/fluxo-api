import { Router } from 'express';

import { type PayrollController } from './payroll.controller';

export function createPayrollRoutes(payrollController: PayrollController) {
  const router = Router();

  router.get('/', payrollController.overview);

  return router;
}
