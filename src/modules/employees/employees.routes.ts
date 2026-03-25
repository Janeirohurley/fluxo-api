import { Router } from 'express';

import { type EmployeesController } from './employees.controller';

export function createEmployeesRoutes(employeesController: EmployeesController) {
  const router = Router();

  router.get('/docs', employeesController.getDocumentation);
  router.get('/roles', employeesController.listRoles);
  router.post('/roles', employeesController.createRole);
  router.get('/positions', employeesController.listPositions);
  router.post('/positions', employeesController.createPosition);
  router.get('/locations', employeesController.listLocations);
  router.post('/locations', employeesController.createLocation);

  router.get('/', employeesController.listEmployees);
  router.post('/', employeesController.createEmployee);
  router.get('/:id', employeesController.getEmployeeById);
  router.patch('/:id', employeesController.updateEmployee);
  router.delete('/:id', employeesController.removeEmployee);

  router.get('/:id/assignments', employeesController.listAssignments);
  router.post('/:id/assignments', employeesController.createAssignment);
  router.get('/:id/contracts', employeesController.listContracts);
  router.post('/:id/contracts', employeesController.createContract);
  router.patch('/:id/contracts/:contractId', employeesController.updateContract);

  return router;
}
