import { type Request, type Response } from 'express';

import { getEmployeesModuleDocumentation } from './employees.docs';
import {
  createEmployeeAssignmentSchema,
  createEmployeeContractSchema,
  createEmployeeLocationSchema,
  createEmployeePositionSchema,
  createEmployeeRoleSchema,
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeContractSchema,
  updateEmployeeSchema
} from './employees.schema';
import { type EmployeesService } from './employees.service';
import { buildPaginatedHttpResponse } from '../../shared/pagination';

export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  getDocumentation = (_req: Request, res: Response) => {
    res.status(200).json(getEmployeesModuleDocumentation());
  };

  listRoles = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.employeesService.listRoles()
    });
  };

  createRole = async (req: Request, res: Response) => {
    const payload = createEmployeeRoleSchema.parse(req.body);
    const role = await this.employeesService.createRole(payload);

    res.status(201).json({
      message: 'Employee role created successfully',
      data: role
    });
  };

  listPositions = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.employeesService.listPositions()
    });
  };

  createPosition = async (req: Request, res: Response) => {
    const payload = createEmployeePositionSchema.parse(req.body);
    const position = await this.employeesService.createPosition(payload);

    res.status(201).json({
      message: 'Employee position created successfully',
      data: position
    });
  };

  listLocations = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.employeesService.listLocations()
    });
  };

  createLocation = async (req: Request, res: Response) => {
    const payload = createEmployeeLocationSchema.parse(req.body);
    const location = await this.employeesService.createLocation(payload);

    res.status(201).json({
      message: 'Employee location created successfully',
      data: location
    });
  };

  listEmployees = async (req: Request, res: Response) => {
    const query = listEmployeesQuerySchema.parse(req.query);
    const result = await this.employeesService.listEmployees(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getEmployeeById = async (req: Request<{ id: string }>, res: Response) => {
    const employee = await this.employeesService.getEmployeeById(req.params.id);

    res.status(200).json({
      data: employee
    });
  };

  createEmployee = async (req: Request, res: Response) => {
    const payload = createEmployeeSchema.parse(req.body);
    const employee = await this.employeesService.createEmployee(payload);

    res.status(201).json({
      message: 'Employee created successfully',
      data: employee
    });
  };

  updateEmployee = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateEmployeeSchema.parse(req.body);
    const employee = await this.employeesService.updateEmployee(req.params.id, payload);

    res.status(200).json({
      message: 'Employee updated successfully',
      data: employee
    });
  };

  removeEmployee = async (req: Request<{ id: string }>, res: Response) => {
    await this.employeesService.removeEmployee(req.params.id);
    res.status(204).send();
  };

  listAssignments = async (req: Request<{ id: string }>, res: Response) => {
    const assignments = await this.employeesService.listAssignmentsByEmployeeId(req.params.id);

    res.status(200).json({
      data: assignments
    });
  };

  createAssignment = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createEmployeeAssignmentSchema.parse(req.body);
    const assignment = await this.employeesService.createAssignment(req.params.id, payload);

    res.status(201).json({
      message: 'Employee assignment created successfully',
      data: assignment
    });
  };

  listContracts = async (req: Request<{ id: string }>, res: Response) => {
    const contracts = await this.employeesService.listContractsByEmployeeId(req.params.id);

    res.status(200).json({
      data: contracts
    });
  };

  createContract = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createEmployeeContractSchema.parse(req.body);
    const contract = await this.employeesService.createContract(req.params.id, payload);

    res.status(201).json({
      message: 'Employee contract created successfully',
      data: contract
    });
  };

  updateContract = async (
    req: Request<{ id: string; contractId: string }>,
    res: Response
  ) => {
    const payload = updateEmployeeContractSchema.parse(req.body);
    const contract = await this.employeesService.updateContract(
      req.params.id,
      req.params.contractId,
      payload
    );

    res.status(200).json({
      message: 'Employee contract updated successfully',
      data: contract
    });
  };
}
