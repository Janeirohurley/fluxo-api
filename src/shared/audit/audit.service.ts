import { type PrismaClient } from '@prisma/client';
import { type Request, type Response } from 'express';

import { readAuditActor, readAuditModuleName, sanitizeAuditValue } from './audit-helpers';

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordHttpMutation(req: Request, res: Response) {
    const method = req.method.toUpperCase();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }

    if (!(req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/admin/subscriptions'))) {
      return;
    }

    const actor = readAuditActor(req, res);
    const moduleName = readAuditModuleName(req.originalUrl);
    const path = req.originalUrl.split('?')[0];
    const requestId = res.locals.requestId ?? null;

    await this.prisma.auditLog.create({
      data: {
        requestId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        actorLabel: actor.actorLabel,
        moduleName,
        action: `${method} ${path}`,
        method,
        path,
        resourceType: moduleName,
        resourceId: typeof req.params?.id === 'string' ? req.params.id : null,
        statusCode: res.statusCode,
        metadata: sanitizeAuditValue({
          params: req.params,
          query: req.query,
          body: req.body
        }) as object
      }
    });
  }
}
