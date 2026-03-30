import { type Request, type Response } from 'express';

import {
  createAssetAssignmentSchema,
  createAssetCategorySchema,
  createAssetSchema,
  createAssetStatusSchema,
  createInterventionTypeSchema,
  listAssetsQuerySchema,
  createMaintenanceLogSchema,
  updateAssetCategorySchema,
  updateAssetAssignmentSchema,
  updateMaintenanceLogSchema,
  updateAssetStatusSchema,
  updateInterventionTypeSchema,
  updateAssetSchema,
  upsertAssetFinanceSchema
} from './assets.schema';
import { getAssetsModuleDocumentation } from './assets.docs';
import { type AssetsService } from './assets.service';
import { buildPaginatedHttpResponse } from '../../shared/pagination';

export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  getDocumentation = (_req: Request, res: Response) => {
    res.status(200).json(getAssetsModuleDocumentation());
  };

  listAssets = async (req: Request, res: Response) => {
    const query = listAssetsQuerySchema.parse(req.query);
    const result = await this.assetsService.listAssets(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getAssetById = async (req: Request<{ id: string }>, res: Response) => {
    const asset = await this.assetsService.getAssetById(req.params.id);

    res.status(200).json({
      data: asset
    });
  };

  createAsset = async (req: Request, res: Response) => {
    const payload = createAssetSchema.parse(req.body);
    const asset = await this.assetsService.createAsset(payload);

    res.status(201).json({
      message: 'Asset created successfully',
      data: asset
    });
  };

  updateAsset = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateAssetSchema.parse(req.body);
    const asset = await this.assetsService.updateAsset(req.params.id, payload);

    res.status(200).json({
      message: 'Asset updated successfully',
      data: asset
    });
  };

  removeAsset = async (req: Request<{ id: string }>, res: Response) => {
    await this.assetsService.removeAsset(req.params.id);

    res.status(204).send();
  };

  listCategories = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.assetsService.listCategories()
    });
  };

  createCategory = async (req: Request, res: Response) => {
    const payload = createAssetCategorySchema.parse(req.body);
    const category = await this.assetsService.createCategory(payload);

    res.status(201).json({
      message: 'Asset category created successfully',
      data: category
    });
  };

  updateCategory = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateAssetCategorySchema.parse(req.body);
    const category = await this.assetsService.updateCategory(req.params.id, payload);

    res.status(200).json({
      message: 'Asset category updated successfully',
      data: category
    });
  };

  removeCategory = async (req: Request<{ id: string }>, res: Response) => {
    await this.assetsService.removeCategory(req.params.id);

    res.status(204).send();
  };

  listStatuses = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.assetsService.listStatuses()
    });
  };

  createStatus = async (req: Request, res: Response) => {
    const payload = createAssetStatusSchema.parse(req.body);
    const status = await this.assetsService.createStatus(payload);

    res.status(201).json({
      message: 'Asset status created successfully',
      data: status
    });
  };

  updateStatus = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateAssetStatusSchema.parse(req.body);
    const status = await this.assetsService.updateStatus(req.params.id, payload);

    res.status(200).json({
      message: 'Asset status updated successfully',
      data: status
    });
  };

  removeStatus = async (req: Request<{ id: string }>, res: Response) => {
    await this.assetsService.removeStatus(req.params.id);

    res.status(204).send();
  };

  listInterventionTypes = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.assetsService.listInterventionTypes()
    });
  };

  createInterventionType = async (req: Request, res: Response) => {
    const payload = createInterventionTypeSchema.parse(req.body);
    const interventionType = await this.assetsService.createInterventionType(payload);

    res.status(201).json({
      message: 'Intervention type created successfully',
      data: interventionType
    });
  };

  updateInterventionType = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateInterventionTypeSchema.parse(req.body);
    const interventionType = await this.assetsService.updateInterventionType(req.params.id, payload);

    res.status(200).json({
      message: 'Intervention type updated successfully',
      data: interventionType
    });
  };

  removeInterventionType = async (req: Request<{ id: string }>, res: Response) => {
    await this.assetsService.removeInterventionType(req.params.id);

    res.status(204).send();
  };

  getAssetFinance = async (req: Request<{ id: string }>, res: Response) => {
    const financeData = await this.assetsService.getAssetFinance(req.params.id);

    res.status(200).json({
      data: financeData
    });
  };

  upsertAssetFinance = async (req: Request<{ id: string }>, res: Response) => {
    const payload = upsertAssetFinanceSchema.parse(req.body);
    const financeData = await this.assetsService.upsertAssetFinance(req.params.id, payload);

    res.status(200).json({
      message: 'Asset finance data saved successfully',
      data: financeData
    });
  };

  listAssignments = async (req: Request<{ id: string }>, res: Response) => {
    const assignments = await this.assetsService.listAssignmentsByAssetId(req.params.id);

    res.status(200).json({
      data: assignments
    });
  };

  createAssignment = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createAssetAssignmentSchema.parse(req.body);
    const assignment = await this.assetsService.createAssignment(req.params.id, payload);

    res.status(201).json({
      message: 'Asset assignment created successfully',
      data: assignment
    });
  };

  updateAssignment = async (
    req: Request<{ id: string; assignmentId: string }>,
    res: Response
  ) => {
    const payload = updateAssetAssignmentSchema.parse(req.body);
    const assignment = await this.assetsService.updateAssignment(
      req.params.id,
      req.params.assignmentId,
      payload
    );

    res.status(200).json({
      message: 'Asset assignment updated successfully',
      data: assignment
    });
  };

  removeAssignment = async (
    req: Request<{ id: string; assignmentId: string }>,
    res: Response
  ) => {
    await this.assetsService.removeAssignment(req.params.id, req.params.assignmentId);

    res.status(204).send();
  };

  listMaintenanceLogs = async (req: Request<{ id: string }>, res: Response) => {
    const logs = await this.assetsService.listMaintenanceLogsByAssetId(req.params.id);

    res.status(200).json({
      data: logs
    });
  };

  createMaintenanceLog = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createMaintenanceLogSchema.parse(req.body);
    const log = await this.assetsService.createMaintenanceLog(req.params.id, payload);

    res.status(201).json({
      message: 'Maintenance log created successfully',
      data: log
    });
  };

  updateMaintenanceLog = async (
    req: Request<{ id: string; maintenanceLogId: string }>,
    res: Response
  ) => {
    const payload = updateMaintenanceLogSchema.parse(req.body);
    const log = await this.assetsService.updateMaintenanceLog(
      req.params.id,
      req.params.maintenanceLogId,
      payload
    );

    res.status(200).json({
      message: 'Maintenance log updated successfully',
      data: log
    });
  };

  removeMaintenanceLog = async (
    req: Request<{ id: string; maintenanceLogId: string }>,
    res: Response
  ) => {
    await this.assetsService.removeMaintenanceLog(req.params.id, req.params.maintenanceLogId);

    res.status(204).send();
  };
}
