import { type Request, type Response } from 'express';

import { type EmployeesService } from './employees.service';

export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  overview = (_req: Request, res: Response) => {
    res.status(200).json(this.employeesService.getOverview());
  };
}
