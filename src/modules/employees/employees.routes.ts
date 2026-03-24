import { Router } from 'express';

import { type EmployeesController } from './employees.controller';

export function createEmployeesRoutes(employeesController: EmployeesController) {
  const router = Router();

  router.get('/', employeesController.overview);

  return router;
}
