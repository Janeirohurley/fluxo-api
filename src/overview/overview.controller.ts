import { type Request, type Response } from 'express';

import { type OverviewService } from './overview.service';
import { type OverviewModuleName } from './overview.types';

export class OverviewController {
  constructor(
    private readonly overviewService: OverviewService,
    private readonly mountedModules: OverviewModuleName[]
  ) {}

  getOverview = async (_req: Request, res: Response) => {
    const accessSession = res.locals.accessSession;
    const overview = await this.overviewService.buildOverview({
      prisma: res.locals.tenantPrisma ?? null,
      accessSession,
      mountedModules: this.mountedModules,
      generatedAt: new Date().toISOString()
    });

    res.status(200).json(overview);
  };
}
