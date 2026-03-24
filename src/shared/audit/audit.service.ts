import { type PrismaClient } from '@prisma/client';
import { type Request, type Response } from 'express';

type AuditActorType = 'access_key' | 'admin_token' | 'anonymous' | 'system';

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entryValue]) => {
    if (/(token|authorization|password|secret|api[_-]?key|module[_-]?key)/i.test(key)) {
      result[key] = '[redacted]';
      return result;
    }

    result[key] = sanitizeValue(entryValue);
    return result;
  }, {});
}

function readModuleName(path: string) {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  if (segments[0] === 'api' && segments[1]) {
    return segments[1];
  }

  if (segments[0] === 'admin') {
    return 'admin';
  }

  if (segments[0] === 'portal') {
    return 'portal';
  }

  return null;
}

function readActor(req: Request, res: Response): {
  actorType: AuditActorType;
  actorId: string | null;
  actorLabel: string | null;
} {
  const accessSession = res.locals.accessSession;

  if (accessSession) {
    return {
      actorType: 'access_key',
      actorId: accessSession.keyId ?? null,
      actorLabel: accessSession.label ?? accessSession.keyPrefix ?? null
    };
  }

  if (req.originalUrl.startsWith('/admin/subscriptions')) {
    return {
      actorType: 'admin_token',
      actorId: 'admin-approval-token',
      actorLabel: 'admin portal'
    };
  }

  return {
    actorType: 'anonymous',
    actorId: null,
    actorLabel: null
  };
}

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

    const actor = readActor(req, res);
    const moduleName = readModuleName(req.originalUrl);
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
        metadata: sanitizeValue({
          params: req.params,
          query: req.query,
          body: req.body
        }) as object
      }
    });
  }
}
