import { z } from 'zod';
import { createPaginationQuerySchema } from '../../shared/pagination';

const uuidSchema = z.string().uuid();
const dateStringSchema = z.string().date();
const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmedString = (max: number) => trimmedString(1, max).optional();
const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}, z.string().min(1).max(120).optional());

export const createAssetCategorySchema = z.object({
  name: trimmedString(2, 80)
});

export const createAssetStatusSchema = z.object({
  name: trimmedString(2, 80)
});

export const createInterventionTypeSchema = z.object({
  name: trimmedString(2, 80)
});

export const createAssetSchema = z.object({
  inventoryCode: trimmedString(2, 60),
  name: trimmedString(2, 120),
  brand: optionalTrimmedString(80),
  model: optionalTrimmedString(80),
  serialNumber: optionalTrimmedString(120),
  categoryId: uuidSchema,
  statusId: uuidSchema
});

export const updateAssetSchema = createAssetSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const listAssetsQuerySchema = createPaginationQuerySchema({
  search: optionalSearchSchema,
  categoryId: uuidSchema.optional(),
  statusId: uuidSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'inventoryCode']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const upsertAssetFinanceSchema = z
  .object({
    acquisitionDate: dateStringSchema,
    purchaseValue: z.number().nonnegative(),
    estimatedLifeYears: z.number().int().positive(),
    residualValue: z.number().nonnegative().optional()
  })
  .superRefine((value, context) => {
    if (
      typeof value.residualValue === 'number' &&
      value.residualValue > value.purchaseValue
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['residualValue'],
        message: 'Residual value cannot be greater than purchase value'
      });
    }
  });

export const createAssetAssignmentSchema = z
  .object({
    employeeId: uuidSchema,
    locationId: uuidSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be before start date'
      });
    }
  });

export const createMaintenanceLogSchema = z.object({
  interventionTypeId: uuidSchema,
  description: optionalTrimmedString(500),
  interventionCost: z.number().nonnegative().optional(),
  provider: optionalTrimmedString(120)
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type CreateAssetStatusInput = z.infer<typeof createAssetStatusSchema>;
export type CreateInterventionTypeInput = z.infer<typeof createInterventionTypeSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
export type UpsertAssetFinanceInput = z.infer<typeof upsertAssetFinanceSchema>;
export type CreateAssetAssignmentInput = z.infer<typeof createAssetAssignmentSchema>;
export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;
