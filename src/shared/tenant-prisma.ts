import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma as TenantPrisma } from '@prisma/client';
import type {
  Prisma as GeneratedTenantPrisma,
  PrismaClient as GeneratedTenantPrismaClient
} from '../../generated/tenant-client/index.js';

type TenantPrismaModule = typeof import('../../generated/tenant-client/index.js');

export type TenantPrismaClientLike = GeneratedTenantPrismaClient;
export type TenantDecimal = GeneratedTenantPrisma.Decimal;
export type TenantAssetWhereInput = GeneratedTenantPrisma.AssetWhereInput;
export type TenantEmployeeWhereInput = GeneratedTenantPrisma.EmployeeWhereInput;
export type TenantEmployeeAssignmentWhereInput = GeneratedTenantPrisma.EmployeeAssignmentWhereInput;

export { TenantPrisma };

export function createTenantPrismaClient(connectionString: string) {
  const { PrismaClient } = require('../../generated/tenant-client/index.js') as TenantPrismaModule;

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString
    }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
}
