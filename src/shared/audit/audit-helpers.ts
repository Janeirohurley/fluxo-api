import { type Request, type Response } from 'express';

type AuditActorType = 'access_key' | 'admin_token' | 'anonymous' | 'system';

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entryValue]) => {
    if (/(token|authorization|password|secret|api[_-]?key|module[_-]?key)/i.test(key)) {
      result[key] = '[redacted]';
      return result;
    }

    result[key] = sanitizeAuditValue(entryValue);
    return result;
  }, {});
}

export function readAuditModuleName(path: string) {
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

export function readAuditActor(
  req: Request,
  res: Response
): {
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
