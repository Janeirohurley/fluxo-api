import { Router } from 'express';

import { type AssetsController } from './assets.controller';

export function createAssetsRoutes(assetsController: AssetsController) {
  const router = Router();

  router.get('/docs', assetsController.getDocumentation);
  router.get('/categories', assetsController.listCategories);
  router.post('/categories', assetsController.createCategory);
  router.get('/statuses', assetsController.listStatuses);
  router.post('/statuses', assetsController.createStatus);
  router.get('/intervention-types', assetsController.listInterventionTypes);
  router.post('/intervention-types', assetsController.createInterventionType);

  router.get('/', assetsController.listAssets);
  router.post('/', assetsController.createAsset);
  router.get('/:id', assetsController.getAssetById);
  router.patch('/:id', assetsController.updateAsset);
  router.delete('/:id', assetsController.removeAsset);

  router.get('/:id/finance', assetsController.getAssetFinance);
  router.put('/:id/finance', assetsController.upsertAssetFinance);
  router.get('/:id/assignments', assetsController.listAssignments);
  router.post('/:id/assignments', assetsController.createAssignment);
  router.get('/:id/maintenance', assetsController.listMaintenanceLogs);
  router.post('/:id/maintenance', assetsController.createMaintenanceLog);

  return router;
}
