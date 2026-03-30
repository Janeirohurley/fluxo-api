import { Router } from 'express';

import { type EmployeesController } from './employees.controller';

export function createEmployeesRoutes(employeesController: EmployeesController) {
  const router = Router();

  router.get('/docs', employeesController.getDocumentation);
  router.get('/roles', employeesController.listRoles);
  router.post('/roles', employeesController.createRole);
  router.patch('/roles/:roleId', employeesController.updateRole);
  router.delete('/roles/:roleId', employeesController.removeRole);
  router.get('/positions', employeesController.listPositions);
  router.post('/positions', employeesController.createPosition);
  router.patch('/positions/:positionId', employeesController.updatePosition);
  router.delete('/positions/:positionId', employeesController.removePosition);
  router.get('/locations', employeesController.listLocations);
  router.post('/locations', employeesController.createLocation);
  router.patch('/locations/:locationId', employeesController.updateLocation);
  router.delete('/locations/:locationId', employeesController.removeLocation);

  router.get('/', employeesController.listEmployees);
  router.post('/', employeesController.createEmployee);
  router.get('/:id', employeesController.getEmployeeById);
  router.patch('/:id', employeesController.updateEmployee);
  router.delete('/:id', employeesController.removeEmployee);

  router.get('/:id/assignments', employeesController.listAssignments);
  router.post('/:id/assignments', employeesController.createAssignment);
  router.patch('/:id/assignments/:assignmentId', employeesController.updateAssignment);
  router.delete('/:id/assignments/:assignmentId', employeesController.removeAssignment);
  router.get('/:id/contracts', employeesController.listContracts);
  router.post('/:id/contracts', employeesController.createContract);
  router.patch('/:id/contracts/:contractId', employeesController.updateContract);
  router.delete('/:id/contracts/:contractId', employeesController.removeContract);

  return router;
}
