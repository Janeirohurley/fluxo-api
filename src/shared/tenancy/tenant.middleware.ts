import { type NextFunction, type Request, type Response } from 'express';

import { HttpError } from '../http-error';
import { runWithTenantContext } from './tenant-context';
import { TenantRoutingService } from './tenant-routing.service';

export function createTenantMiddleware(tenantRoutingService: TenantRoutingService) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const accessSession = res.locals.accessSession;

      if (!accessSession) {
        throw new HttpError(401, 'Access session is missing for tenant resolution');
      }

      if (!accessSession.company) {
        throw new HttpError(403, 'This access key is not attached to any company');
      }

      const tenant = await tenantRoutingService.resolveTenantConnection(accessSession.company.id);

      res.locals.tenantPrisma = tenant.prisma;
      res.locals.tenantDatabaseName = tenant.databaseName;

      runWithTenantContext(
        {
          tenantPrisma: tenant.prisma,
          accessSession,
          databaseName: tenant.databaseName
        },
        () => next()
      );
    } catch (error) {
      next(error);
    }
  };
}
