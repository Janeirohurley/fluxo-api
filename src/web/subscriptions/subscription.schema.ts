import { z } from 'zod';

import { MODULE_CODES } from './module-catalog';

export const createSubscriptionRequestSchema = z.object({
  companyName: z.string().min(2).max(120),
  email: z.string().email(),
  modules: z.array(z.enum(MODULE_CODES as [string, ...string[]])).min(1),
  notes: z.string().max(1200).optional()
});

export const adminDecisionSchema = z.object({
  adminMessage: z.string().max(1200).optional()
});

export type CreateSubscriptionRequestInput = z.infer<typeof createSubscriptionRequestSchema>;
export type AdminDecisionInput = z.infer<typeof adminDecisionSchema>;
