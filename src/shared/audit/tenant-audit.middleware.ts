import { type NextFunction, type Request, type Response } from 'express';

import { type TenantPrismaClientLike } from '../tenant-prisma';
import { TenantAuditService } from './tenant-audit.service';

export function createTenantAuditMiddleware(
  resolvePrisma?: (req: Request, res: Response) => TenantPrismaClientLike | null
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantPrisma = resolvePrisma ? resolvePrisma(req, res) : (res.locals.tenantPrisma ?? null);

    if (!tenantPrisma) {
      return next();
    }

    const tenantAuditService = new TenantAuditService(tenantPrisma);

    res.on('finish', () => {
      void tenantAuditService.recordHttpMutation(req, res).catch((error) => {
        console.error(
          JSON.stringify({
            level: 'error',
            requestId: res.locals.requestId ?? null,
            message: error instanceof Error ? error.message : 'Failed to write tenant audit log'
          })
        );
      });
    });

    next();
  };
}
