import { type PrismaClient } from '@prisma/client';

import { HttpError } from '../http-error';
import { TenantPrismaManager } from './tenant-prisma-manager';

export class TenantRoutingService {
  constructor(
    private readonly adminPrisma: PrismaClient,
    private readonly tenantPrismaManager: TenantPrismaManager
  ) {}

  async resolveTenantConnection(companyId: string) {
    const database = await this.adminPrisma.companyDatabase.findUnique({
      where: {
        companyId
      }
    });

    if (!database) {
      throw new HttpError(404, 'No tenant database is registered for this company');
    }

    if (database.provisioningStatus !== 'ready') {
      throw new HttpError(409, 'The tenant database is not ready yet', {
        provisioningStatus: database.provisioningStatus,
        databaseName: database.databaseName
      });
    }

    const prisma = await this.tenantPrismaManager.getClient(database.connectionString);

    return {
      prisma,
      databaseName: database.databaseName,
      provisioningStatus: database.provisioningStatus
    };
  }
}
