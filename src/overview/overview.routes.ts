import { Router } from 'express';

import { type OverviewController } from './overview.controller';

export function createOverviewRoutes(overviewController: OverviewController) {
  const router = Router();

  router.get('/', overviewController.getOverview);

  return router;
}
