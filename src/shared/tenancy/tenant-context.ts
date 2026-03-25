import { AsyncLocalStorage } from 'node:async_hooks';

import { type AccessSession } from '../access/access.types';
import { HttpError } from '../http-error';
import { type TenantPrismaClientLike } from '../tenant-prisma';

type TenantRequestContext = {
  tenantPrisma: TenantPrismaClientLike | null;
  accessSession: AccessSession | null;
  databaseName: string | null;
};

const tenantContextStorage = new AsyncLocalStorage<TenantRequestContext>();

export function runWithTenantContext<T>(context: TenantRequestContext, callback: () => T) {
  return tenantContextStorage.run(context, callback);
}

export function getCurrentTenantPrisma() {
  return tenantContextStorage.getStore()?.tenantPrisma ?? null;
}

export function getRequiredTenantPrisma() {
  const prisma = getCurrentTenantPrisma();

  if (!prisma) {
    throw new HttpError(503, 'Tenant database connection is not available for this request');
  }

  return prisma;
}

export function getCurrentTenantContext() {
  return tenantContextStorage.getStore() ?? null;
}
