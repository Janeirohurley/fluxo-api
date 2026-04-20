import { type AssetsRepository } from './assets.repository';
import {
  type CreateAssetAssignmentInput,
  type CreateAssetCategoryInput,
  type CreateAssetInput,
  type CreateAssetStatusInput,
  type ListAssetsQuery,
  type CreateInterventionTypeInput,
  type CreateMaintenanceLogInput,
  type UpdateAssetCategoryInput,
  type UpdateAssetAssignmentInput,
  type UpdateMaintenanceLogInput,
  type UpdateAssetStatusInput,
  type UpdateInterventionTypeInput,
  type UpdateAssetInput,
  type UpsertAssetFinanceInput
} from './assets.schema';
import {
  type Asset,
  type AssetAssignment,
  type AssetCategory,
  type AssetDetails,
  type AssetFinanceData,
  type AssetListResult,
  type AssetStatus,
  type InterventionType,
  type MaintenanceLog
} from './assets.types';
import { HttpError } from '../../shared/http-error';
import { buildPaginatedResult } from '../../shared/pagination';

export class AssetsService {
  constructor(private readonly repository: AssetsRepository) {}

  async listAssets(input: ListAssetsQuery): Promise<AssetListResult> {
    const assets = await this.repository.listAssets(input);
    const data = await Promise.all(assets.items.map((asset) => this.enrichAsset(asset)));

    return buildPaginatedResult(data, input, assets.total);
  }

  async getAssetById(id: string): Promise<AssetDetails> {
    return this.enrichAsset(await this.repository.getAssetById(id));
  }

  async createAsset(input: CreateAssetInput): Promise<AssetDetails> {
    await Promise.all([
      this.repository.getCategoryById(input.categoryId),
      this.repository.getStatusById(input.statusId)
    ]);

    return this.enrichAsset(await this.repository.createAsset(input));
  }

  async updateAsset(id: string, input: UpdateAssetInput): Promise<AssetDetails> {
    const existingAsset = await this.repository.getAssetById(id);

    if (input.categoryId) {
      await this.repository.getCategoryById(input.categoryId);
    }

    if (input.statusId) {
      const status = await this.repository.getStatusById(input.statusId);
      await this.assertAssetCanUseStatus(existingAsset.id, status.name);
    }

    return this.enrichAsset(await this.repository.updateAsset(id, input));
  }

  async removeAsset(id: string, req?: any): Promise<void> {
    const relationSummary = await this.repository.getAssetRelationSummary(id);

    if (
      relationSummary.hasFinanceData ||
      relationSummary.assignmentsCount > 0 ||
      relationSummary.maintenanceLogsCount > 0
    ) {
      const t = req?.t as (key: string) => string;
      throw new HttpError(409, t ? t('error.asset_delete_forbidden') : 'Cannot delete an asset that already has finance or history records', {
        relationSummary
      });
    }

    await this.repository.removeAsset(id);
  }

  listCategories(): Promise<AssetCategory[]> {
    return this.repository.listCategories();
  }

  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    return this.repository.createCategory(input);
  }

  updateCategory(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    return this.repository.updateCategory(id, input);
  }

  async removeCategory(id: string, req?: any): Promise<void> {
    const assetsCount = await this.repository.countAssetsByCategoryId(id);

    if (assetsCount > 0) {
      const t = req?.t as (key: string) => string;
      throw new HttpError(409, t ? t('error.asset_category_delete_forbidden') : 'Cannot delete an asset category that is already used by assets', {
        assetsCount
      });
    }

    await this.repository.removeCategory(id);
  }

  listStatuses(): Promise<AssetStatus[]> {
    return this.repository.listStatuses();
  }

  createStatus(input: CreateAssetStatusInput): Promise<AssetStatus> {
    return this.repository.createStatus(input);
  }

  updateStatus(id: string, input: UpdateAssetStatusInput): Promise<AssetStatus> {
    return this.repository.updateStatus(id, input);
  }

  async removeStatus(id: string, req?: any): Promise<void> {
    const assetsCount = await this.repository.countAssetsByStatusId(id);

    if (assetsCount > 0) {
      const t = req?.t as (key: string) => string;
      throw new HttpError(409, t ? t('error.asset_status_delete_forbidden') : 'Cannot delete an asset status that is already used by assets', {
        assetsCount
      });
    }

    await this.repository.removeStatus(id);
  }

  listInterventionTypes(): Promise<InterventionType[]> {
    return this.repository.listInterventionTypes();
  }

  createInterventionType(input: CreateInterventionTypeInput): Promise<InterventionType> {
    return this.repository.createInterventionType(input);
  }

  updateInterventionType(
    id: string,
    input: UpdateInterventionTypeInput
  ): Promise<InterventionType> {
    return this.repository.updateInterventionType(id, input);
  }

  async removeInterventionType(id: string, req?: any): Promise<void> {
    const maintenanceLogsCount = await this.repository.countMaintenanceLogsByInterventionTypeId(id);

    if (maintenanceLogsCount > 0) {
      const t = req?.t as (key: string) => string;
      throw new HttpError(
        409,
        t ? t('error.intervention_type_delete_forbidden') : 'Cannot delete an intervention type that is already used by maintenance logs',
        {
          maintenanceLogsCount
        }
      );
    }

    await this.repository.removeInterventionType(id);
  }

  async getAssetFinance(assetId: string): Promise<AssetFinanceData | null> {
    await this.repository.getAssetById(assetId);
    return this.repository.getAssetFinance(assetId);
  }

  async upsertAssetFinance(
    assetId: string,
    input: UpsertAssetFinanceInput
  ): Promise<AssetFinanceData> {
    const asset = await this.repository.getAssetById(assetId);
    await this.assertAssetCanUseStatus(asset.id, (await this.repository.getStatusById(asset.statusId)).name);

    return this.repository.upsertAssetFinance(assetId, input);
  }

  async listAssignmentsByAssetId(assetId: string): Promise<AssetAssignment[]> {
    await this.repository.getAssetById(assetId);
    return this.repository.listAssignmentsByAssetId(assetId);
  }

  async createAssignment(
    assetId: string,
    input: CreateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    const asset = await this.repository.getAssetById(assetId);
    const status = await this.repository.getStatusById(asset.statusId);

    await this.assertAssetCanUseStatus(asset.id, status.name);
    await this.assertNoAssignmentOverlap(assetId, input);

    return this.repository.createAssignment(assetId, input);
  }

  async updateAssignment(
    assetId: string,
    assignmentId: string,
    input: UpdateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    const existingAssignment = await this.repository.getAssignmentById(assetId, assignmentId);
    const nextAssignment: CreateAssetAssignmentInput = {
      employeeId: input.employeeId ?? existingAssignment.employeeId,
      locationId: input.locationId ?? existingAssignment.locationId,
      startDate: input.startDate ?? existingAssignment.startDate,
      endDate: input.endDate ?? existingAssignment.endDate ?? undefined
    };

    await this.assertNoAssignmentOverlap(assetId, nextAssignment, assignmentId);

    return this.repository.updateAssignment(assetId, assignmentId, input);
  }

  async removeAssignment(assetId: string, assignmentId: string): Promise<void> {
    await this.repository.removeAssignment(assetId, assignmentId);
  }

  async listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]> {
    await this.repository.getAssetById(assetId);
    return this.repository.listMaintenanceLogsByAssetId(assetId);
  }

  async createMaintenanceLog(
    assetId: string,
    input: CreateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    await Promise.all([
      this.repository.getAssetById(assetId),
      this.repository.getInterventionTypeById(input.interventionTypeId)
    ]);

    return this.repository.createMaintenanceLog(assetId, input);
  }

  async updateMaintenanceLog(
    assetId: string,
    maintenanceLogId: string,
    input: UpdateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    const existingLog = await this.repository.getMaintenanceLogById(assetId, maintenanceLogId);

    if (input.interventionTypeId) {
      await this.repository.getInterventionTypeById(input.interventionTypeId);
    } else {
      await this.repository.getInterventionTypeById(existingLog.interventionTypeId);
    }

    return this.repository.updateMaintenanceLog(assetId, maintenanceLogId, input);
  }

  async removeMaintenanceLog(assetId: string, maintenanceLogId: string): Promise<void> {
    await this.repository.removeMaintenanceLog(assetId, maintenanceLogId);
  }

  private async assertAssetCanUseStatus(assetId: string, statusName: string) {
    if (statusName.trim().toLowerCase() !== 'disposed') {
      return;
    }

    const assignments = await this.repository.listAssignmentsByAssetId(assetId);
    const hasActiveAssignment = assignments.some((assignment) =>
      this.isAssignmentActive(assignment.endDate)
    );

    if (hasActiveAssignment) {
      throw new HttpError(
        409,
        'This asset cannot be marked as disposed while it still has an active assignment'
      );
    }
  }

  private async assertNoAssignmentOverlap(
    assetId: string,
    input: CreateAssetAssignmentInput,
    ignoreAssignmentId?: string
  ) {
    const assignments = await this.repository.listAssignmentsByAssetId(assetId);
    const hasOverlap = assignments.some((assignment) =>
      assignment.id !== ignoreAssignmentId &&
      this.dateRangesOverlap(
        input.startDate,
        input.endDate,
        assignment.startDate,
        assignment.endDate
      )
    );

    if (hasOverlap) {
      throw new HttpError(
        409,
        'This asset already has an assignment covering the requested period'
      );
    }
  }

  private isAssignmentActive(endDate?: string) {
    if (!endDate) {
      return true;
    }

    return endDate >= new Date().toISOString().slice(0, 10);
  }

  private dateRangesOverlap(
    startDate: string,
    endDate: string | undefined,
    existingStartDate: string,
    existingEndDate: string | undefined
  ) {
    const start = startDate;
    const end = endDate ?? '9999-12-31';
    const existingStart = existingStartDate;
    const existingEnd = existingEndDate ?? '9999-12-31';

    return start <= existingEnd && existingStart <= end;
  }

  private async enrichAsset(asset: Asset): Promise<AssetDetails> {
    const [category, status, financeData, assignments, maintenanceLogs] = await Promise.all([
      this.repository.getCategoryById(asset.categoryId),
      this.repository.getStatusById(asset.statusId),
      this.repository.getAssetFinance(asset.id),
      this.repository.listAssignmentsByAssetId(asset.id),
      this.repository.listMaintenanceLogsByAssetId(asset.id)
    ]);

    return {
      ...asset,
      category,
      status,
      financeData,
      assignments,
      maintenanceLogs
    };
  }
}
