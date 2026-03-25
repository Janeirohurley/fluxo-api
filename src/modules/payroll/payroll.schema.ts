import { z } from 'zod';

import { createPaginationQuerySchema } from '../../shared/pagination';

const uuidSchema = z.string().uuid();
const dateStringSchema = z.string().date();
const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmedString = (max: number) => trimmedString(1, max).optional();
const normalizedSearchSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}, z.string().min(1).max(120).optional());

export const paySlipStatusSchema = z.enum(['draft', 'issued', 'paid', 'cancelled']);
export const paySlipLineTypeSchema = z.enum(['earning', 'deduction', 'tax', 'benefit']);

export const createPaySlipLineSchema = z.object({
  lineType: paySlipLineTypeSchema,
  label: trimmedString(2, 120),
  amount: z.number().positive(),
  description: optionalTrimmedString(255)
});

const paySlipBaseSchema = z.object({
  employeeId: uuidSchema,
  contractId: uuidSchema,
  payPeriodStart: dateStringSchema,
  payPeriodEnd: dateStringSchema,
  paymentDate: dateStringSchema.optional(),
  currency: z.string().trim().length(3).default('BIF'),
  notes: optionalTrimmedString(500),
  lines: z.array(createPaySlipLineSchema).min(1)
});

export const createPaySlipSchema = paySlipBaseSchema.superRefine((value, context) => {
  if (value.payPeriodEnd < value.payPeriodStart) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payPeriodEnd'],
      message: 'Pay period end cannot be before pay period start'
    });
  }

  if (value.paymentDate && value.paymentDate < value.payPeriodStart) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentDate'],
      message: 'Payment date cannot be before pay period start'
    });
  }
});

export const updatePaySlipSchema = z
  .object({
    payPeriodStart: dateStringSchema.optional(),
    payPeriodEnd: dateStringSchema.optional(),
    paymentDate: dateStringSchema.optional(),
    currency: z.string().trim().length(3).optional(),
    notes: optionalTrimmedString(500),
    lines: z.array(createPaySlipLineSchema).min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update'
  })
  .superRefine((value, context) => {
    if (value.payPeriodStart && value.payPeriodEnd && value.payPeriodEnd < value.payPeriodStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payPeriodEnd'],
        message: 'Pay period end cannot be before pay period start'
      });
    }
  });

export const listPaySlipsQuerySchema = createPaginationQuerySchema({
  search: normalizedSearchSchema,
  status: paySlipStatusSchema.optional(),
  employeeId: uuidSchema.optional(),
  contractId: uuidSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'payPeriodStart', 'payPeriodEnd', 'grossAmount', 'netAmount'])
    .default('payPeriodStart'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const listPayrollContractsQuerySchema = createPaginationQuerySchema({
  search: normalizedSearchSchema,
  status: z.string().trim().min(1).max(40).optional(),
  employeeId: uuidSchema.optional(),
  paymentFrequency: z.string().trim().min(1).max(40).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'startDate', 'endDate', 'salaryAmount'])
    .default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const markPaySlipPaidSchema = z
  .object({
    paymentDate: dateStringSchema.optional()
  })
  .default({});

export const createPaySlipJournalEntrySchema = z.object({
  expenseAccountId: uuidSchema,
  payrollPayableAccountId: uuidSchema,
  deductionsPayableAccountId: uuidSchema.optional(),
  entryDate: dateStringSchema.optional(),
  entryNumber: optionalTrimmedString(60),
  description: optionalTrimmedString(500),
  status: z.enum(['draft', 'posted']).default('draft'),
  postedBy: uuidSchema.optional()
});

export const registerPaySlipPaymentSchema = z.object({
  transactionTypeId: uuidSchema,
  paymentMethodId: uuidSchema,
  transactionDate: dateStringSchema.optional(),
  referenceNumber: optionalTrimmedString(120),
  description: optionalTrimmedString(500),
  markAsPaid: z.boolean().default(true)
});

export const generatePayRunSchema = z
  .object({
    payPeriodStart: dateStringSchema,
    payPeriodEnd: dateStringSchema,
    paymentDate: dateStringSchema.optional(),
    contractIds: z.array(uuidSchema).min(1).optional(),
    earningLabel: trimmedString(2, 120).default('Base salary'),
    notes: optionalTrimmedString(500),
    skipExisting: z.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (value.payPeriodEnd < value.payPeriodStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payPeriodEnd'],
        message: 'Pay period end cannot be before pay period start'
      });
    }

    if (value.paymentDate && value.paymentDate < value.payPeriodStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentDate'],
        message: 'Payment date cannot be before pay period start'
      });
    }
  });

export type CreatePaySlipLineInput = z.input<typeof createPaySlipLineSchema>;
export type CreatePaySlipInput = z.input<typeof createPaySlipSchema>;
export type UpdatePaySlipInput = z.input<typeof updatePaySlipSchema>;
export type ListPaySlipsQuery = z.infer<typeof listPaySlipsQuerySchema>;
export type ListPayrollContractsQuery = z.infer<typeof listPayrollContractsQuerySchema>;
export type MarkPaySlipPaidInput = z.input<typeof markPaySlipPaidSchema>;
export type CreatePaySlipJournalEntryInput = z.input<typeof createPaySlipJournalEntrySchema>;
export type RegisterPaySlipPaymentInput = z.input<typeof registerPaySlipPaymentSchema>;
export type GeneratePayRunInput = z.input<typeof generatePayRunSchema>;
