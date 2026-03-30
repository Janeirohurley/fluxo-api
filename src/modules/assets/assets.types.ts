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
  type UpsertAssetFinanceInput
} from './assets.schema';
import { type PaginatedResult } from '../../shared/pagination';

type EntityTimestamps = {
  createdAt: string;
  updatedAt: string;
};

export type AssetCategory = EntityTimestamps &
  CreateAssetCategoryInput & {
    id: string;
  };

export type AssetStatus = EntityTimestamps &
  CreateAssetStatusInput & {
    id: string;
  };

export type InterventionType = EntityTimestamps &
  CreateInterventionTypeInput & {
    id: string;
  };

export type Asset = EntityTimestamps &
  CreateAssetInput & {
    id: string;
  };

export type AssetFinanceData = EntityTimestamps &
  UpsertAssetFinanceInput & {
    assetId: string;
  };

export type AssetAssignment = EntityTimestamps &
  CreateAssetAssignmentInput & {
    id: string;
    assetId: string;
  };

export type MaintenanceLog = EntityTimestamps &
  CreateMaintenanceLogInput & {
    id: string;
    assetId: string;
  };

export type AssetDetails = Asset & {
  category: AssetCategory | null;
  status: AssetStatus | null;
  financeData: AssetFinanceData | null;
  assignments: AssetAssignment[];
  maintenanceLogs: MaintenanceLog[];
};

export type AssetListResult = PaginatedResult<AssetDetails>;

export type AssetListQueryResult = {
  items: Asset[];
  total: number;
};

export type AssetRelationSummary = {
  hasFinanceData: boolean;
  assignmentsCount: number;
  maintenanceLogsCount: number;
};

export type AssetListFilters = ListAssetsQuery;

export type UpdateAssetCategory = UpdateAssetCategoryInput;
export type UpdateAssetStatus = UpdateAssetStatusInput;
export type UpdateInterventionType = UpdateInterventionTypeInput;
export type UpdateAssetAssignment = UpdateAssetAssignmentInput;
export type UpdateMaintenanceLog = UpdateMaintenanceLogInput;
