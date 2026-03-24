import { type Request, type Response } from 'express';

import { type FinanceService } from './finance.service';

export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  overview = (_req: Request, res: Response) => {
    res.status(200).json(this.financeService.getOverview());
  };
}
