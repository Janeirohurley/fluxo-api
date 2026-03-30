import { HttpError } from '../../shared/http-error';
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
  type AssetFinanceData,
  type AssetListQueryResult,
  type AssetRelationSummary,
  type AssetStatus,
  type InterventionType,
  type MaintenanceLog
} from './assets.types';
import { slicePage } from '../../shared/pagination';
import {
  type TenantAssetWhereInput,
  type TenantDecimal,
  TenantPrisma,
  type TenantPrismaClientLike
} from '../../shared/tenant-prisma';

export interface AssetsRepository {
  listAssets(input: ListAssetsQuery): Promise<AssetListQueryResult>;
  getAssetById(id: string): Promise<Asset>;
  createAsset(input: CreateAssetInput): Promise<Asset>;
  updateAsset(id: string, input: UpdateAssetInput): Promise<Asset>;
  removeAsset(id: string): Promise<void>;
  getAssetRelationSummary(id: string): Promise<AssetRelationSummary>;
  listCategories(): Promise<AssetCategory[]>;
  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory>;
  updateCategory(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory>;
  removeCategory(id: string): Promise<void>;
  getCategoryById(id: string): Promise<AssetCategory>;
  countAssetsByCategoryId(id: string): Promise<number>;
  listStatuses(): Promise<AssetStatus[]>;
  createStatus(input: CreateAssetStatusInput): Promise<AssetStatus>;
  updateStatus(id: string, input: UpdateAssetStatusInput): Promise<AssetStatus>;
  removeStatus(id: string): Promise<void>;
  getStatusById(id: string): Promise<AssetStatus>;
  countAssetsByStatusId(id: string): Promise<number>;
  listInterventionTypes(): Promise<InterventionType[]>;
  createInterventionType(input: CreateInterventionTypeInput): Promise<InterventionType>;
  updateInterventionType(id: string, input: UpdateInterventionTypeInput): Promise<InterventionType>;
  removeInterventionType(id: string): Promise<void>;
  getInterventionTypeById(id: string): Promise<InterventionType>;
  countMaintenanceLogsByInterventionTypeId(id: string): Promise<number>;
  getAssetFinance(assetId: string): Promise<AssetFinanceData | null>;
  upsertAssetFinance(assetId: string, input: UpsertAssetFinanceInput): Promise<AssetFinanceData>;
  listAssignmentsByAssetId(assetId: string): Promise<AssetAssignment[]>;
  getAssignmentById(assetId: string, assignmentId: string): Promise<AssetAssignment>;
  createAssignment(assetId: string, input: CreateAssetAssignmentInput): Promise<AssetAssignment>;
  updateAssignment(
    assetId: string,
    assignmentId: string,
    input: UpdateAssetAssignmentInput
  ): Promise<AssetAssignment>;
  removeAssignment(assetId: string, assignmentId: string): Promise<void>;
  listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]>;
  getMaintenanceLogById(assetId: string, maintenanceLogId: string): Promise<MaintenanceLog>;
  createMaintenanceLog(assetId: string, input: CreateMaintenanceLogInput): Promise<MaintenanceLog>;
  updateMaintenanceLog(
    assetId: string,
    maintenanceLogId: string,
    input: UpdateMaintenanceLogInput
  ): Promise<MaintenanceLog>;
  removeMaintenanceLog(assetId: string, maintenanceLogId: string): Promise<void>;
}

export class InMemoryAssetsRepository implements AssetsRepository {
  private readonly assets = new Map<string, Asset>();
  private readonly categories = new Map<string, AssetCategory>();
  private readonly statuses = new Map<string, AssetStatus>();
  private readonly interventionTypes = new Map<string, InterventionType>();
  private readonly financeData = new Map<string, AssetFinanceData>();
  private readonly assignments = new Map<string, AssetAssignment>();
  private readonly maintenanceLogs = new Map<string, MaintenanceLog>();

  constructor() {
    this.seedReferenceData();
  }

  async listAssets(input: ListAssetsQuery): Promise<AssetListQueryResult> {
    const filteredAssets = Array.from(this.assets.values())
      .filter((asset) => this.matchesAssetFilters(asset, input))
      .sort((left, right) => this.compareAssets(left, right, input));

    return {
      items: slicePage(filteredAssets, input),
      total: filteredAssets.length
    };
  }

  async getAssetById(id: string): Promise<Asset> {
    const asset = this.assets.get(id);

    if (!asset) {
      throw new HttpError(404, `Asset with id "${id}" not found`);
    }

    return asset;
  }

  async createAsset(input: CreateAssetInput): Promise<Asset> {
    this.assertUniqueInventoryCode(input.inventoryCode);

    const timestamp = new Date().toISOString();
    const asset: Asset = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
    const existing = await this.getAssetById(id);
    const nextInventoryCode = input.inventoryCode ?? existing.inventoryCode;

    this.assertUniqueInventoryCode(nextInventoryCode, id);

    const updated: Asset = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.assets.set(id, updated);
    return updated;
  }

  async removeAsset(id: string): Promise<void> {
    await this.getAssetById(id);
    this.assets.delete(id);
    this.financeData.delete(id);

    for (const assignment of await this.listAssignmentsByAssetId(id)) {
      this.assignments.delete(assignment.id);
    }

    for (const log of await this.listMaintenanceLogsByAssetId(id)) {
      this.maintenanceLogs.delete(log.id);
    }
  }

  async getAssetRelationSummary(id: string): Promise<AssetRelationSummary> {
    await this.getAssetById(id);

    return {
      hasFinanceData: this.financeData.has(id),
      assignmentsCount: (await this.listAssignmentsByAssetId(id)).length,
      maintenanceLogsCount: (await this.listMaintenanceLogsByAssetId(id)).length
    };
  }

  async listCategories(): Promise<AssetCategory[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    this.assertUniqueName(this.categories, input.name, 'Asset category');

    const category = this.createTimestampedEntity(input);
    this.categories.set(category.id, category);
    return category;
  }

  async updateCategory(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    const existing = await this.getCategoryById(id);
    const nextName = input.name ?? existing.name;

    this.assertUniqueName(this.categories, nextName, 'Asset category', id);

    const updated: AssetCategory = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.categories.set(id, updated);
    return updated;
  }

  async removeCategory(id: string): Promise<void> {
    await this.getCategoryById(id);
    this.categories.delete(id);
  }

  async getCategoryById(id: string): Promise<AssetCategory> {
    const category = this.categories.get(id);

    if (!category) {
      throw new HttpError(404, `Asset category with id "${id}" not found`);
    }

    return category;
  }

  async countAssetsByCategoryId(id: string): Promise<number> {
    return Array.from(this.assets.values()).filter((asset) => asset.categoryId === id).length;
  }

  async listStatuses(): Promise<AssetStatus[]> {
    return Array.from(this.statuses.values());
  }

  async createStatus(input: CreateAssetStatusInput): Promise<AssetStatus> {
    this.assertUniqueName(this.statuses, input.name, 'Asset status');

    const status = this.createTimestampedEntity(input);
    this.statuses.set(status.id, status);
    return status;
  }

  async updateStatus(id: string, input: UpdateAssetStatusInput): Promise<AssetStatus> {
    const existing = await this.getStatusById(id);
    const nextName = input.name ?? existing.name;

    this.assertUniqueName(this.statuses, nextName, 'Asset status', id);

    const updated: AssetStatus = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.statuses.set(id, updated);
    return updated;
  }

  async removeStatus(id: string): Promise<void> {
    await this.getStatusById(id);
    this.statuses.delete(id);
  }

  async getStatusById(id: string): Promise<AssetStatus> {
    const status = this.statuses.get(id);

    if (!status) {
      throw new HttpError(404, `Asset status with id "${id}" not found`);
    }

    return status;
  }

  async countAssetsByStatusId(id: string): Promise<number> {
    return Array.from(this.assets.values()).filter((asset) => asset.statusId === id).length;
  }

  async listInterventionTypes(): Promise<InterventionType[]> {
    return Array.from(this.interventionTypes.values());
  }

  async createInterventionType(input: CreateInterventionTypeInput): Promise<InterventionType> {
    this.assertUniqueName(this.interventionTypes, input.name, 'Intervention type');

    const interventionType = this.createTimestampedEntity(input);
    this.interventionTypes.set(interventionType.id, interventionType);
    return interventionType;
  }

  async updateInterventionType(
    id: string,
    input: UpdateInterventionTypeInput
  ): Promise<InterventionType> {
    const existing = await this.getInterventionTypeById(id);
    const nextName = input.name ?? existing.name;

    this.assertUniqueName(this.interventionTypes, nextName, 'Intervention type', id);

    const updated: InterventionType = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.interventionTypes.set(id, updated);
    return updated;
  }

  async removeInterventionType(id: string): Promise<void> {
    await this.getInterventionTypeById(id);
    this.interventionTypes.delete(id);
  }

  async getInterventionTypeById(id: string): Promise<InterventionType> {
    const interventionType = this.interventionTypes.get(id);

    if (!interventionType) {
      throw new HttpError(404, `Intervention type with id "${id}" not found`);
    }

    return interventionType;
  }

  async countMaintenanceLogsByInterventionTypeId(id: string): Promise<number> {
    return Array.from(this.maintenanceLogs.values()).filter((log) => log.interventionTypeId === id)
      .length;
  }

  async getAssetFinance(assetId: string): Promise<AssetFinanceData | null> {
    return this.financeData.get(assetId) ?? null;
  }

  async upsertAssetFinance(
    assetId: string,
    input: UpsertAssetFinanceInput
  ): Promise<AssetFinanceData> {
    const timestamp = new Date().toISOString();
    const existing = this.financeData.get(assetId);
    const finance: AssetFinanceData = {
      assetId,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...input
    };

    this.financeData.set(assetId, finance);
    return finance;
  }

  async listAssignmentsByAssetId(assetId: string): Promise<AssetAssignment[]> {
    return Array.from(this.assignments.values()).filter((assignment) => assignment.assetId === assetId);
  }

  async getAssignmentById(assetId: string, assignmentId: string): Promise<AssetAssignment> {
    const assignment = this.assignments.get(assignmentId);

    if (!assignment || assignment.assetId !== assetId) {
      throw new HttpError(404, `Asset assignment with id "${assignmentId}" not found`);
    }

    return assignment;
  }

  async createAssignment(
    assetId: string,
    input: CreateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    const assignment: AssetAssignment = {
      ...this.createTimestampedEntity(input),
      assetId
    };

    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async updateAssignment(
    assetId: string,
    assignmentId: string,
    input: UpdateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    const existing = await this.getAssignmentById(assetId, assignmentId);
    const updated: AssetAssignment = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.assignments.set(assignmentId, updated);
    return updated;
  }

  async removeAssignment(assetId: string, assignmentId: string): Promise<void> {
    await this.getAssignmentById(assetId, assignmentId);
    this.assignments.delete(assignmentId);
  }

  async listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]> {
    return Array.from(this.maintenanceLogs.values()).filter((log) => log.assetId === assetId);
  }

  async getMaintenanceLogById(assetId: string, maintenanceLogId: string): Promise<MaintenanceLog> {
    const maintenanceLog = this.maintenanceLogs.get(maintenanceLogId);

    if (!maintenanceLog || maintenanceLog.assetId !== assetId) {
      throw new HttpError(404, `Maintenance log with id "${maintenanceLogId}" not found`);
    }

    return maintenanceLog;
  }

  async createMaintenanceLog(
    assetId: string,
    input: CreateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    const maintenanceLog: MaintenanceLog = {
      ...this.createTimestampedEntity(input),
      assetId
    };

    this.maintenanceLogs.set(maintenanceLog.id, maintenanceLog);
    return maintenanceLog;
  }

  async updateMaintenanceLog(
    assetId: string,
    maintenanceLogId: string,
    input: UpdateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    const existing = await this.getMaintenanceLogById(assetId, maintenanceLogId);
    const updated: MaintenanceLog = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.maintenanceLogs.set(maintenanceLogId, updated);
    return updated;
  }

  async removeMaintenanceLog(assetId: string, maintenanceLogId: string): Promise<void> {
    await this.getMaintenanceLogById(assetId, maintenanceLogId);
    this.maintenanceLogs.delete(maintenanceLogId);
  }

  private createTimestampedEntity<T extends object>(input: T) {
    const timestamp = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input
    };
  }

  private matchesAssetFilters(asset: Asset, input: ListAssetsQuery) {
    if (input.categoryId && asset.categoryId !== input.categoryId) {
      return false;
    }

    if (input.statusId && asset.statusId !== input.statusId) {
      return false;
    }

    if (!input.search) {
      return true;
    }

    const haystack = [
      asset.inventoryCode,
      asset.name,
      asset.brand,
      asset.model,
      asset.serialNumber
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase();

    return haystack.includes(input.search.toLowerCase());
  }

  private compareAssets(left: Asset, right: Asset, input: ListAssetsQuery) {
    const leftValue = left[input.sortBy] ?? '';
    const rightValue = right[input.sortBy] ?? '';
    const normalizedLeft = typeof leftValue === 'string' ? leftValue.toLowerCase() : String(leftValue);
    const normalizedRight =
      typeof rightValue === 'string' ? rightValue.toLowerCase() : String(rightValue);

    const comparison = normalizedLeft.localeCompare(normalizedRight);

    return input.sortOrder === 'asc' ? comparison : comparison * -1;
  }

  private assertUniqueInventoryCode(inventoryCode: string, ignoreAssetId?: string) {
    const duplicate = Array.from(this.assets.values()).find(
      (asset) => asset.inventoryCode === inventoryCode && asset.id !== ignoreAssetId
    );

    if (duplicate) {
      throw new HttpError(409, `Asset with inventory code "${inventoryCode}" already exists`);
    }
  }

  private assertUniqueName<T extends { id: string; name: string }>(
    records: Map<string, T>,
    name: string,
    label: string,
    ignoreId?: string
  ) {
    const duplicate = Array.from(records.values()).find(
      (record) => record.name === name && record.id !== ignoreId
    );

    if (duplicate) {
      throw new HttpError(409, `${label} "${name}" already exists`);
    }
  }

  private seedReferenceData() {
    ['IT Equipment', 'Vehicles', 'Furniture', 'Buildings'].forEach((name) => {
      const category = this.createTimestampedEntity({ name });
      this.categories.set(category.id, category);
    });

    ['active', 'inactive', 'maintenance', 'disposed'].forEach((name) => {
      const status = this.createTimestampedEntity({ name });
      this.statuses.set(status.id, status);
    });

    ['preventive', 'corrective', 'inspection'].forEach((name) => {
      const interventionType = this.createTimestampedEntity({ name });
      this.interventionTypes.set(interventionType.id, interventionType);
    });
  }
}

export class PrismaAssetsRepository implements AssetsRepository {
  constructor(
    private readonly prismaResolver:
      | TenantPrismaClientLike
      | (() => TenantPrismaClientLike | null)
  ) {}

  private get prisma() {
    const prisma =
      typeof this.prismaResolver === 'function' ? this.prismaResolver() : this.prismaResolver;

    if (!prisma) {
      throw new HttpError(503, 'Tenant database client is not available for assets');
    }

    return prisma;
  }

  async listAssets(input: ListAssetsQuery): Promise<AssetListQueryResult> {
    const where = this.buildAssetWhereInput(input);
    const [assets, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        orderBy: {
          [input.sortBy]: input.sortOrder
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.asset.count({
        where
      })
    ]);

    return {
      items: assets.map((asset) => this.toAsset(asset)),
      total
    };
  }

  async getAssetById(id: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { id }
    });

    if (!asset) {
      throw new HttpError(404, `Asset with id "${id}" not found`);
    }

    return this.toAsset(asset);
  }

  async createAsset(input: CreateAssetInput): Promise<Asset> {
    try {
      const asset = await this.prisma.asset.create({
        data: input
      });

      return this.toAsset(asset);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Asset with inventory code "${input.inventoryCode}" already exists`
      });
    }
  }

  async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
    try {
      const asset = await this.prisma.asset.update({
        where: { id },
        data: input
      });

      return this.toAsset(asset);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset with id "${id}" not found`,
        uniqueMessage:
          input.inventoryCode !== undefined
            ? `Asset with inventory code "${input.inventoryCode}" already exists`
            : 'An asset with the same unique value already exists'
      });
    }
  }

  async removeAsset(id: string): Promise<void> {
    try {
      await this.prisma.asset.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset with id "${id}" not found`
      });
    }
  }

  async getAssetRelationSummary(id: string): Promise<AssetRelationSummary> {
    await this.getAssetById(id);

    const [financeData, assignmentsCount, maintenanceLogsCount] = await this.prisma.$transaction([
      this.prisma.assetFinanceData.count({ where: { assetId: id } }),
      this.prisma.assetAssignment.count({ where: { assetId: id } }),
      this.prisma.maintenanceLog.count({ where: { assetId: id } })
    ]);

    return {
      hasFinanceData: financeData > 0,
      assignmentsCount,
      maintenanceLogsCount
    };
  }

  async listCategories(): Promise<AssetCategory[]> {
    const categories = await this.prisma.assetCategory.findMany({
      orderBy: { name: 'asc' }
    });

    return categories.map((category) => this.toAssetCategory(category));
  }

  async createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    try {
      const category = await this.prisma.assetCategory.create({
        data: input
      });

      return this.toAssetCategory(category);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Asset category "${input.name}" already exists`
      });
    }
  }

  async updateCategory(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    try {
      const category = await this.prisma.assetCategory.update({
        where: { id },
        data: input
      });

      return this.toAssetCategory(category);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset category with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Asset category "${input.name}" already exists`
            : 'An asset category with the same unique value already exists'
      });
    }
  }

  async removeCategory(id: string): Promise<void> {
    try {
      await this.prisma.assetCategory.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset category with id "${id}" not found`
      });
    }
  }

  async getCategoryById(id: string): Promise<AssetCategory> {
    const category = await this.prisma.assetCategory.findUnique({
      where: { id }
    });

    if (!category) {
      throw new HttpError(404, `Asset category with id "${id}" not found`);
    }

    return this.toAssetCategory(category);
  }

  countAssetsByCategoryId(id: string): Promise<number> {
    return this.prisma.asset.count({
      where: { categoryId: id }
    });
  }

  async listStatuses(): Promise<AssetStatus[]> {
    const statuses = await this.prisma.assetStatus.findMany({
      orderBy: { name: 'asc' }
    });

    return statuses.map((status) => this.toAssetStatus(status));
  }

  async createStatus(input: CreateAssetStatusInput): Promise<AssetStatus> {
    try {
      const status = await this.prisma.assetStatus.create({
        data: input
      });

      return this.toAssetStatus(status);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Asset status "${input.name}" already exists`
      });
    }
  }

  async updateStatus(id: string, input: UpdateAssetStatusInput): Promise<AssetStatus> {
    try {
      const status = await this.prisma.assetStatus.update({
        where: { id },
        data: input
      });

      return this.toAssetStatus(status);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset status with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Asset status "${input.name}" already exists`
            : 'An asset status with the same unique value already exists'
      });
    }
  }

  async removeStatus(id: string): Promise<void> {
    try {
      await this.prisma.assetStatus.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Asset status with id "${id}" not found`
      });
    }
  }

  async getStatusById(id: string): Promise<AssetStatus> {
    const status = await this.prisma.assetStatus.findUnique({
      where: { id }
    });

    if (!status) {
      throw new HttpError(404, `Asset status with id "${id}" not found`);
    }

    return this.toAssetStatus(status);
  }

  countAssetsByStatusId(id: string): Promise<number> {
    return this.prisma.asset.count({
      where: { statusId: id }
    });
  }

  async listInterventionTypes(): Promise<InterventionType[]> {
    const interventionTypes = await this.prisma.interventionType.findMany({
      orderBy: { name: 'asc' }
    });

    return interventionTypes.map((interventionType) => this.toInterventionType(interventionType));
  }

  async createInterventionType(input: CreateInterventionTypeInput): Promise<InterventionType> {
    try {
      const interventionType = await this.prisma.interventionType.create({
        data: input
      });

      return this.toInterventionType(interventionType);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Intervention type "${input.name}" already exists`
      });
    }
  }

  async updateInterventionType(
    id: string,
    input: UpdateInterventionTypeInput
  ): Promise<InterventionType> {
    try {
      const interventionType = await this.prisma.interventionType.update({
        where: { id },
        data: input
      });

      return this.toInterventionType(interventionType);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Intervention type with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Intervention type "${input.name}" already exists`
            : 'An intervention type with the same unique value already exists'
      });
    }
  }

  async removeInterventionType(id: string): Promise<void> {
    try {
      await this.prisma.interventionType.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Intervention type with id "${id}" not found`
      });
    }
  }

  async getInterventionTypeById(id: string): Promise<InterventionType> {
    const interventionType = await this.prisma.interventionType.findUnique({
      where: { id }
    });

    if (!interventionType) {
      throw new HttpError(404, `Intervention type with id "${id}" not found`);
    }

    return this.toInterventionType(interventionType);
  }

  countMaintenanceLogsByInterventionTypeId(id: string): Promise<number> {
    return this.prisma.maintenanceLog.count({
      where: { interventionTypeId: id }
    });
  }

  async getAssetFinance(assetId: string): Promise<AssetFinanceData | null> {
    const financeData = await this.prisma.assetFinanceData.findUnique({
      where: { assetId }
    });

    return financeData ? this.toAssetFinanceData(financeData) : null;
  }

  async upsertAssetFinance(
    assetId: string,
    input: UpsertAssetFinanceInput
  ): Promise<AssetFinanceData> {
    const financeData = await this.prisma.assetFinanceData.upsert({
      where: { assetId },
      create: {
        assetId,
        acquisitionDate: new Date(input.acquisitionDate),
        purchaseValue: input.purchaseValue,
        estimatedLifeYears: input.estimatedLifeYears,
        residualValue: input.residualValue ?? null
      },
      update: {
        acquisitionDate: new Date(input.acquisitionDate),
        purchaseValue: input.purchaseValue,
        estimatedLifeYears: input.estimatedLifeYears,
        residualValue: input.residualValue ?? null
      }
    });

    return this.toAssetFinanceData(financeData);
  }

  async listAssignmentsByAssetId(assetId: string): Promise<AssetAssignment[]> {
    const assignments = await this.prisma.assetAssignment.findMany({
      where: { assetId },
      orderBy: { startDate: 'desc' }
    });

    return assignments.map((assignment) => this.toAssetAssignment(assignment));
  }

  async getAssignmentById(assetId: string, assignmentId: string): Promise<AssetAssignment> {
    const assignment = await this.prisma.assetAssignment.findFirst({
      where: {
        id: assignmentId,
        assetId
      }
    });

    if (!assignment) {
      throw new HttpError(404, `Asset assignment with id "${assignmentId}" not found`);
    }

    return this.toAssetAssignment(assignment);
  }

  async createAssignment(
    assetId: string,
    input: CreateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    const assignment = await this.prisma.assetAssignment.create({
      data: {
        assetId,
        employeeId: input.employeeId,
        locationId: input.locationId,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null
      }
    });

    return this.toAssetAssignment(assignment);
  }

  async updateAssignment(
    assetId: string,
    assignmentId: string,
    input: UpdateAssetAssignmentInput
  ): Promise<AssetAssignment> {
    await this.getAssignmentById(assetId, assignmentId);

    const assignment = await this.prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {})
      }
    });

    return this.toAssetAssignment(assignment);
  }

  async removeAssignment(assetId: string, assignmentId: string): Promise<void> {
    await this.getAssignmentById(assetId, assignmentId);

    await this.prisma.assetAssignment.delete({
      where: { id: assignmentId }
    });
  }

  async listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]> {
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' }
    });

    return maintenanceLogs.map((log) => this.toMaintenanceLog(log));
  }

  async getMaintenanceLogById(assetId: string, maintenanceLogId: string): Promise<MaintenanceLog> {
    const maintenanceLog = await this.prisma.maintenanceLog.findFirst({
      where: {
        id: maintenanceLogId,
        assetId
      }
    });

    if (!maintenanceLog) {
      throw new HttpError(404, `Maintenance log with id "${maintenanceLogId}" not found`);
    }

    return this.toMaintenanceLog(maintenanceLog);
  }

  async createMaintenanceLog(
    assetId: string,
    input: CreateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    const maintenanceLog = await this.prisma.maintenanceLog.create({
      data: {
        assetId,
        interventionTypeId: input.interventionTypeId,
        description: input.description,
        interventionCost: input.interventionCost ?? null,
        provider: input.provider
      }
    });

    return this.toMaintenanceLog(maintenanceLog);
  }

  async updateMaintenanceLog(
    assetId: string,
    maintenanceLogId: string,
    input: UpdateMaintenanceLogInput
  ): Promise<MaintenanceLog> {
    await this.getMaintenanceLogById(assetId, maintenanceLogId);

    const maintenanceLog = await this.prisma.maintenanceLog.update({
      where: { id: maintenanceLogId },
      data: {
        ...(input.interventionTypeId ? { interventionTypeId: input.interventionTypeId } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.interventionCost !== undefined ? { interventionCost: input.interventionCost ?? null } : {}),
        ...(input.provider !== undefined ? { provider: input.provider ?? null } : {})
      }
    });

    return this.toMaintenanceLog(maintenanceLog);
  }

  async removeMaintenanceLog(assetId: string, maintenanceLogId: string): Promise<void> {
    await this.getMaintenanceLogById(assetId, maintenanceLogId);

    await this.prisma.maintenanceLog.delete({
      where: { id: maintenanceLogId }
    });
  }

  private buildAssetWhereInput(input: ListAssetsQuery): TenantAssetWhereInput {
    const search = input.search
      ? {
          OR: [
            { inventoryCode: { contains: input.search, mode: 'insensitive' as const } },
            { name: { contains: input.search, mode: 'insensitive' as const } },
            { brand: { contains: input.search, mode: 'insensitive' as const } },
            { model: { contains: input.search, mode: 'insensitive' as const } },
            { serialNumber: { contains: input.search, mode: 'insensitive' as const } }
          ]
        }
      : undefined;

    return {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.statusId ? { statusId: input.statusId } : {}),
      ...(search ?? {})
    };
  }

  private rethrowKnownError(
    error: unknown,
    options: {
      notFoundMessage?: string;
      uniqueMessage?: string;
    }
  ): never {
    if (error instanceof TenantPrisma.PrismaClientKnownRequestError) {
      const knownError = error as InstanceType<typeof TenantPrisma.PrismaClientKnownRequestError>;

      if (knownError.code === 'P2025' && options.notFoundMessage) {
        throw new HttpError(404, options.notFoundMessage);
      }

      if (knownError.code === 'P2002') {
        throw new HttpError(
          409,
          options.uniqueMessage ?? 'A resource with the same unique value already exists',
          {
            target: knownError.meta?.target ?? null
          }
        );
      }
    }

    throw error;
  }

  private toAssetCategory(category: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): AssetCategory {
    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    };
  }

  private toAssetStatus(status: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): AssetStatus {
    return {
      id: status.id,
      name: status.name,
      createdAt: status.createdAt.toISOString(),
      updatedAt: status.updatedAt.toISOString()
    };
  }

  private toInterventionType(interventionType: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): InterventionType {
    return {
      id: interventionType.id,
      name: interventionType.name,
      createdAt: interventionType.createdAt.toISOString(),
      updatedAt: interventionType.updatedAt.toISOString()
    };
  }

  private toAsset(asset: {
    id: string;
    inventoryCode: string;
    name: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    categoryId: string;
    statusId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Asset {
    return {
      id: asset.id,
      inventoryCode: asset.inventoryCode,
      name: asset.name,
      brand: asset.brand ?? undefined,
      model: asset.model ?? undefined,
      serialNumber: asset.serialNumber ?? undefined,
      categoryId: asset.categoryId,
      statusId: asset.statusId,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString()
    };
  }

  private toAssetFinanceData(financeData: {
    assetId: string;
    acquisitionDate: Date;
    purchaseValue: TenantDecimal;
    estimatedLifeYears: number;
    residualValue: TenantDecimal | null;
    createdAt: Date;
    updatedAt: Date;
  }): AssetFinanceData {
    return {
      assetId: financeData.assetId,
      acquisitionDate: financeData.acquisitionDate.toISOString().slice(0, 10),
      purchaseValue: financeData.purchaseValue.toNumber(),
      estimatedLifeYears: financeData.estimatedLifeYears,
      residualValue: financeData.residualValue?.toNumber(),
      createdAt: financeData.createdAt.toISOString(),
      updatedAt: financeData.updatedAt.toISOString()
    };
  }

  private toAssetAssignment(assignment: {
    id: string;
    assetId: string;
    employeeId: string;
    locationId: string;
    startDate: Date;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AssetAssignment {
    return {
      id: assignment.id,
      assetId: assignment.assetId,
      employeeId: assignment.employeeId,
      locationId: assignment.locationId,
      startDate: assignment.startDate.toISOString().slice(0, 10),
      endDate: assignment.endDate?.toISOString().slice(0, 10),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    };
  }

  private toMaintenanceLog(log: {
    id: string;
    assetId: string;
    interventionTypeId: string;
    description: string | null;
    interventionCost: TenantDecimal | null;
    provider: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MaintenanceLog {
    return {
      id: log.id,
      assetId: log.assetId,
      interventionTypeId: log.interventionTypeId,
      description: log.description ?? undefined,
      interventionCost: log.interventionCost?.toNumber(),
      provider: log.provider ?? undefined,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString()
    };
  }
}
