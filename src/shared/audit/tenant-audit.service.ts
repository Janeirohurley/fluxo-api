import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { type Request, type Response } from 'express';

import { type PrismaClientLike } from '../prisma';
import { readAuditActor, readAuditModuleName, sanitizeAuditValue } from './audit-helpers';

export class TenantAuditService {
  constructor(private readonly prisma: PrismaClientLike) {}

  async recordHttpMutation(req: Request, res: Response) {
    const method = req.method.toUpperCase();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }

    if (!req.originalUrl.startsWith('/api/')) {
      return;
    }

    const actor = readAuditActor(req, res);
    const moduleName = readAuditModuleName(req.originalUrl);
    const path = req.originalUrl.split('?')[0];
    const requestId = res.locals.requestId ?? null;
    const metadata = sanitizeAuditValue({
      params: req.params,
      query: req.query,
      body: req.body
    });

    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_audit_logs (
          id,
          request_id,
          actor_type,
          actor_id,
          actor_label,
          module_name,
          action,
          method,
          path,
          resource_type,
          resource_id,
          status_code,
          metadata,
          before_data,
          after_data,
          created_at
        )
        VALUES (
          ${randomUUID()},
          ${requestId},
          ${actor.actorType}::"TenantAuditActorType",
          ${actor.actorId},
          ${actor.actorLabel},
          ${moduleName},
          ${`${method} ${path}`},
          ${method},
          ${path},
          ${moduleName},
          ${typeof req.params?.id === 'string' ? req.params.id : null},
          ${res.statusCode},
          ${JSON.stringify(metadata)}::jsonb,
          NULL,
          NULL,
          NOW()
        )
      `
    );
  }
}
