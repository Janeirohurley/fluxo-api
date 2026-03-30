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

export const createPaymentMethodSchema = z.object({
  name: trimmedString(2, 80)
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const createTransactionTypeSchema = z.object({
  name: trimmedString(2, 80)
});

export const updateTransactionTypeSchema = createTransactionTypeSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const createAccountingAccountSchema = z.object({
  code: trimmedString(2, 20),
  name: trimmedString(2, 120),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  isActive: z.boolean().default(true)
});

export const updateAccountingAccountSchema = createAccountingAccountSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update'
  });

export const createTransactionSchema = z.object({
  transactionTypeId: uuidSchema,
  accountingCategory: trimmedString(2, 120),
  amount: z.number().positive(),
  paymentMethodId: uuidSchema,
  referenceNumber: optionalTrimmedString(120),
  transactionDate: dateStringSchema,
  description: optionalTrimmedString(500),
  employeeId: uuidSchema.optional(),
  assetId: uuidSchema.optional(),
  paySlipId: uuidSchema.optional(),
  journalEntryId: uuidSchema.optional()
});

export const updateTransactionSchema = createTransactionSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const listTransactionsQuerySchema = createPaginationQuerySchema({
  search: optionalSearchSchema,
  transactionTypeId: uuidSchema.optional(),
  paymentMethodId: uuidSchema.optional(),
  assetId: uuidSchema.optional(),
  accountingCategory: z.string().trim().min(1).max(120).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt', 'updatedAt']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateTo < value.dateFrom) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'dateTo cannot be before dateFrom'
    });
  }
});

export const createJournalEntryLineSchema = z
  .object({
    accountId: uuidSchema,
    debitAmount: z.number().nonnegative().default(0),
    creditAmount: z.number().nonnegative().default(0),
    description: optionalTrimmedString(500),
    employeeId: uuidSchema.optional(),
    assetId: uuidSchema.optional(),
    paySlipId: uuidSchema.optional(),
    referenceNumber: optionalTrimmedString(120)
  })
  .superRefine((value, context) => {
    const hasDebit = value.debitAmount > 0;
    const hasCredit = value.creditAmount > 0;

    if (hasDebit === hasCredit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each journal entry line must contain either a debit amount or a credit amount'
      });
    }
  });

export const createJournalEntrySchema = z
  .object({
    entryNumber: trimmedString(2, 60),
    entryDate: dateStringSchema,
    description: optionalTrimmedString(500),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    status: z.enum(['draft', 'posted']).default('draft'),
    postedBy: uuidSchema.optional(),
    lines: z.array(createJournalEntryLineSchema).min(2)
  })
  .superRefine((value, context) => {
    const totalDebit = value.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = value.lines.reduce((sum, line) => sum + line.creditAmount, 0);

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lines'],
        message: 'Journal entry must be balanced: total debit must equal total credit'
      });
    }
  });

export const listJournalEntriesQuerySchema = createPaginationQuerySchema({
  search: optionalSearchSchema,
  status: z.enum(['draft', 'posted']).optional(),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  sortBy: z.enum(['entryDate', 'createdAt', 'updatedAt', 'entryNumber']).default('entryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const postJournalEntrySchema = z.object({
  postedBy: uuidSchema.optional()
});

export const createReconciliationSchema = z
  .object({
    reconciliationType: trimmedString(2, 80),
    accountId: uuidSchema,
    statementStartDate: dateStringSchema,
    statementEndDate: dateStringSchema,
    statementBalance: z.number(),
    bookBalance: z.number(),
    status: z.enum(['open', 'closed']).default('open'),
    closedBy: uuidSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.statementEndDate < value.statementStartDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statementEndDate'],
        message: 'statementEndDate cannot be before statementStartDate'
      });
    }
  });

export const listReconciliationsQuerySchema = createPaginationQuerySchema({
  status: z.enum(['open', 'closed']).optional(),
  accountId: uuidSchema.optional(),
  reconciliationType: z.string().trim().min(1).max(80).optional(),
  sortBy: z
    .enum(['statementEndDate', 'statementStartDate', 'createdAt', 'updatedAt'])
    .default('statementEndDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const closeReconciliationSchema = z.object({
  closedBy: uuidSchema.optional()
});

export const createReconciliationItemSchema = z
  .object({
    transactionId: uuidSchema.optional(),
    journalEntryLineId: uuidSchema.optional()
  })
  .superRefine((value, context) => {
    const refs = [value.transactionId, value.journalEntryLineId].filter(Boolean);

    if (refs.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one source must be provided: transactionId or journalEntryLineId'
      });
    }
  });

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type CreateTransactionTypeInput = z.infer<typeof createTransactionTypeSchema>;
export type UpdateTransactionTypeInput = z.infer<typeof updateTransactionTypeSchema>;
export type CreateAccountingAccountInput = z.infer<typeof createAccountingAccountSchema>;
export type UpdateAccountingAccountInput = z.infer<typeof updateAccountingAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type CreateJournalEntryLineInput = z.infer<typeof createJournalEntryLineSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>;
export type PostJournalEntryInput = z.infer<typeof postJournalEntrySchema>;
export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type ListReconciliationsQuery = z.infer<typeof listReconciliationsQuerySchema>;
export type CloseReconciliationInput = z.infer<typeof closeReconciliationSchema>;
export type CreateReconciliationItemInput = z.infer<typeof createReconciliationItemSchema>;
