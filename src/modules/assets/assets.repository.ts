import { Prisma, type PrismaClient } from '@prisma/client';

import { HttpError } from '../../shared/http-error';
import {
  type CreateAssetAssignmentInput,
  type CreateAssetCategoryInput,
  type CreateAssetInput,
  type CreateAssetStatusInput,
  type ListAssetsQuery,
  type CreateInterventionTypeInput,
  type CreateMaintenanceLogInput,
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

export interface AssetsRepository {
  listAssets(input: ListAssetsQuery): Promise<AssetListQueryResult>;
  getAssetById(id: string): Promise<Asset>;
  createAsset(input: CreateAssetInput): Promise<Asset>;
  updateAsset(id: string, input: UpdateAssetInput): Promise<Asset>;
  removeAsset(id: string): Promise<void>;
  getAssetRelationSummary(id: string): Promise<AssetRelationSummary>;
  listCategories(): Promise<AssetCategory[]>;
  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory>;
  getCategoryById(id: string): Promise<AssetCategory>;
  listStatuses(): Promise<AssetStatus[]>;
  createStatus(input: CreateAssetStatusInput): Promise<AssetStatus>;
  getStatusById(id: string): Promise<AssetStatus>;
  listInterventionTypes(): Promise<InterventionType[]>;
  createInterventionType(input: CreateInterventionTypeInput): Promise<InterventionType>;
  getInterventionTypeById(id: string): Promise<InterventionType>;
  getAssetFinance(assetId: string): Promise<AssetFinanceData | null>;
  upsertAssetFinance(assetId: string, input: UpsertAssetFinanceInput): Promise<AssetFinanceData>;
  listAssignmentsByAssetId(assetId: string): Promise<AssetAssignment[]>;
  createAssignment(assetId: string, input: CreateAssetAssignmentInput): Promise<AssetAssignment>;
  listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]>;
  createMaintenanceLog(assetId: string, input: CreateMaintenanceLogInput): Promise<MaintenanceLog>;
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

  async getCategoryById(id: string): Promise<AssetCategory> {
    const category = this.categories.get(id);

    if (!category) {
      throw new HttpError(404, `Asset category with id "${id}" not found`);
    }

    return category;
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

  async getStatusById(id: string): Promise<AssetStatus> {
    const status = this.statuses.get(id);

    if (!status) {
      throw new HttpError(404, `Asset status with id "${id}" not found`);
    }

    return status;
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

  async getInterventionTypeById(id: string): Promise<InterventionType> {
    const interventionType = this.interventionTypes.get(id);

    if (!interventionType) {
      throw new HttpError(404, `Intervention type with id "${id}" not found`);
    }

    return interventionType;
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

  async listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]> {
    return Array.from(this.maintenanceLogs.values()).filter((log) => log.assetId === assetId);
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
    label: string
  ) {
    const duplicate = Array.from(records.values()).find((record) => record.name === name);

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
  constructor(private readonly prisma: PrismaClient) {}

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

  async getCategoryById(id: string): Promise<AssetCategory> {
    const category = await this.prisma.assetCategory.findUnique({
      where: { id }
    });

    if (!category) {
      throw new HttpError(404, `Asset category with id "${id}" not found`);
    }

    return this.toAssetCategory(category);
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

  async getStatusById(id: string): Promise<AssetStatus> {
    const status = await this.prisma.assetStatus.findUnique({
      where: { id }
    });

    if (!status) {
      throw new HttpError(404, `Asset status with id "${id}" not found`);
    }

    return this.toAssetStatus(status);
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

  async getInterventionTypeById(id: string): Promise<InterventionType> {
    const interventionType = await this.prisma.interventionType.findUnique({
      where: { id }
    });

    if (!interventionType) {
      throw new HttpError(404, `Intervention type with id "${id}" not found`);
    }

    return this.toInterventionType(interventionType);
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

  async listMaintenanceLogsByAssetId(assetId: string): Promise<MaintenanceLog[]> {
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' }
    });

    return maintenanceLogs.map((log) => this.toMaintenanceLog(log));
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

  private buildAssetWhereInput(input: ListAssetsQuery): Prisma.AssetWhereInput {
    const search = input.search
      ? {
          OR: [
            { inventoryCode: { contains: input.search, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: input.search, mode: Prisma.QueryMode.insensitive } },
            { brand: { contains: input.search, mode: Prisma.QueryMode.insensitive } },
            { model: { contains: input.search, mode: Prisma.QueryMode.insensitive } },
            { serialNumber: { contains: input.search, mode: Prisma.QueryMode.insensitive } }
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025' && options.notFoundMessage) {
        throw new HttpError(404, options.notFoundMessage);
      }

      if (error.code === 'P2002') {
        throw new HttpError(
          409,
          options.uniqueMessage ?? 'A resource with the same unique value already exists',
          {
            target: error.meta?.target ?? null
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
    purchaseValue: Prisma.Decimal;
    estimatedLifeYears: number;
    residualValue: Prisma.Decimal | null;
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
    interventionCost: Prisma.Decimal | null;
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
