import { createHash, randomBytes } from 'crypto';

export function hashAccessKey(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function generateAccessKeyValue() {
  return `flx_live_${randomBytes(24).toString('hex')}`;
}

export function getAccessKeyPrefix(value: string) {
  return value.slice(0, 16);
}

export function readAccessKeyFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const rawValue = headers['x-module-key'] ?? headers['x-api-key'] ?? headers.authorization;

  if (!rawValue) {
    return null;
  }

  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (value.toLowerCase().startsWith('bearer ')) {
    return value.slice(7).trim();
  }

  return value.trim();
}
