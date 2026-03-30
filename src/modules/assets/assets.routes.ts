import { Router } from 'express';

import { type AssetsController } from './assets.controller';

export function createAssetsRoutes(assetsController: AssetsController) {
  const router = Router();

  router.get('/docs', assetsController.getDocumentation);
  router.get('/categories', assetsController.listCategories);
  router.post('/categories', assetsController.createCategory);
  router.patch('/categories/:id', assetsController.updateCategory);
  router.delete('/categories/:id', assetsController.removeCategory);
  router.get('/statuses', assetsController.listStatuses);
  router.post('/statuses', assetsController.createStatus);
  router.patch('/statuses/:id', assetsController.updateStatus);
  router.delete('/statuses/:id', assetsController.removeStatus);
  router.get('/intervention-types', assetsController.listInterventionTypes);
  router.post('/intervention-types', assetsController.createInterventionType);
  router.patch('/intervention-types/:id', assetsController.updateInterventionType);
  router.delete('/intervention-types/:id', assetsController.removeInterventionType);

  router.get('/', assetsController.listAssets);
  router.post('/', assetsController.createAsset);
  router.get('/:id', assetsController.getAssetById);
  router.patch('/:id', assetsController.updateAsset);
  router.delete('/:id', assetsController.removeAsset);

  router.get('/:id/finance', assetsController.getAssetFinance);
  router.put('/:id/finance', assetsController.upsertAssetFinance);
  router.get('/:id/assignments', assetsController.listAssignments);
  router.post('/:id/assignments', assetsController.createAssignment);
  router.patch('/:id/assignments/:assignmentId', assetsController.updateAssignment);
  router.delete('/:id/assignments/:assignmentId', assetsController.removeAssignment);
  router.get('/:id/maintenance', assetsController.listMaintenanceLogs);
  router.post('/:id/maintenance', assetsController.createMaintenanceLog);
  router.patch('/:id/maintenance/:maintenanceLogId', assetsController.updateMaintenanceLog);
  router.delete('/:id/maintenance/:maintenanceLogId', assetsController.removeMaintenanceLog);

  return router;
}
