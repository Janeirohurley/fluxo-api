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

export const employeeStatusSchema = z.enum(['active', 'inactive', 'on_leave', 'terminated']);
export const contractStatusSchema = z.enum(['draft', 'active', 'suspended', 'terminated', 'expired']);
export const paymentFrequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']);

export const createEmployeeRoleSchema = z.object({
  name: trimmedString(2, 80)
});

export const updateEmployeeRoleSchema = z.object({
  name: trimmedString(2, 80)
});

export const createEmployeePositionSchema = z.object({
  name: trimmedString(2, 120)
});

export const updateEmployeePositionSchema = z.object({
  name: trimmedString(2, 120)
});

export const createEmployeeLocationSchema = z.object({
  name: trimmedString(2, 120)
});

export const updateEmployeeLocationSchema = z.object({
  name: trimmedString(2, 120)
});

const employeeBaseSchema = z.object({
  employeeNumber: trimmedString(2, 40),
  firstName: trimmedString(2, 80),
  lastName: trimmedString(2, 80),
  email: z.string().trim().email().max(160).optional(),
  phone: optionalTrimmedString(40),
  hireDate: dateStringSchema
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  status: employeeStatusSchema.default('active')
});

export const updateEmployeeSchema = employeeBaseSchema
  .extend({
    status: employeeStatusSchema.optional()
  })
  .partial()
  .refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const listEmployeesQuerySchema = createPaginationQuerySchema({
  search: optionalSearchSchema,
  status: employeeStatusSchema.optional(),
  roleId: uuidSchema.optional(),
  positionId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'employeeNumber', 'firstName', 'lastName', 'hireDate'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const employeeAssignmentBaseSchema = z.object({
  roleId: uuidSchema,
  positionId: uuidSchema,
  locationId: uuidSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema.optional()
});

export const createEmployeeAssignmentSchema = employeeAssignmentBaseSchema
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be before start date'
      });
    }
  });

export const updateEmployeeAssignmentSchema = employeeAssignmentBaseSchema
  .partial()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided for update'
      });
    }

    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be before start date'
      });
    }
  });

const employeeContractBaseSchema = z.object({
  contractType: trimmedString(2, 80),
  status: contractStatusSchema.default('active'),
  startDate: dateStringSchema,
  endDate: dateStringSchema.optional(),
  salaryAmount: z.number().nonnegative(),
  currency: z.string().trim().length(3).default('BIF'),
  paymentFrequency: paymentFrequencySchema.default('monthly')
});

export const createEmployeeContractSchema = employeeContractBaseSchema
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be before start date'
      });
    }
  });

export const updateEmployeeContractSchema = employeeContractBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export type CreateEmployeeRoleInput = z.infer<typeof createEmployeeRoleSchema>;
export type UpdateEmployeeRoleInput = z.infer<typeof updateEmployeeRoleSchema>;
export type CreateEmployeePositionInput = z.infer<typeof createEmployeePositionSchema>;
export type UpdateEmployeePositionInput = z.infer<typeof updateEmployeePositionSchema>;
export type CreateEmployeeLocationInput = z.infer<typeof createEmployeeLocationSchema>;
export type UpdateEmployeeLocationInput = z.infer<typeof updateEmployeeLocationSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type CreateEmployeeAssignmentInput = z.infer<typeof createEmployeeAssignmentSchema>;
export type UpdateEmployeeAssignmentInput = z.infer<typeof updateEmployeeAssignmentSchema>;
export type CreateEmployeeContractInput = z.infer<typeof createEmployeeContractSchema>;
export type UpdateEmployeeContractInput = z.infer<typeof updateEmployeeContractSchema>;
