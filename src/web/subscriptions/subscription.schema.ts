import { z } from 'zod';

import { MODULE_CATALOG, MODULE_CODES } from './module-catalog';

const AVAILABLE_MODULE_CODES = MODULE_CATALOG.filter(
  (module) => module.availability === 'available'
).map((module) => module.code) as [string, ...string[]];

export const createSubscriptionRequestSchema = z.object({
  companyName: z.string().min(2).max(120),
  email: z.string().email(),
  modules: z.array(z.enum(AVAILABLE_MODULE_CODES)).min(1),
  notes: z.string().max(1200).optional()
});

export const adminDecisionSchema = z.object({
  adminMessage: z.string().max(1200).optional()
});

export const updateSubscriptionModulesSchema = z.object({
  modules: z.array(z.enum(AVAILABLE_MODULE_CODES)).min(1),
  adminMessage: z.string().max(1200).optional()
});

export type CreateSubscriptionRequestInput = z.infer<typeof createSubscriptionRequestSchema>;
export type AdminDecisionInput = z.infer<typeof adminDecisionSchema>;
export type UpdateSubscriptionModulesInput = z.infer<typeof updateSubscriptionModulesSchema>;
