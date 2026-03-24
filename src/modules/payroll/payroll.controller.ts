import { type Request, type Response } from 'express';

import { type PayrollService } from './payroll.service';

export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  overview = (_req: Request, res: Response) => {
    res.status(200).json(this.payrollService.getOverview());
  };
}
