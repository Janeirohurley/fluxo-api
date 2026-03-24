import { Router } from 'express';

import { type FinanceController } from './finance.controller';

export function createFinanceRoutes(financeController: FinanceController) {
  const router = Router();

  router.get('/', financeController.overview);

  return router;
}
