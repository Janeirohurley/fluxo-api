const camelSegmentPattern = /([a-z0-9])([A-Z])/g;

function toSnakeCaseKey(value: string) {
  return value
    .replace(camelSegmentPattern, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function toSnakeCaseResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseResponse(item)) as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entryValue]) => {
    result[toSnakeCaseKey(key)] = toSnakeCaseResponse(entryValue);
    return result;
  }, {}) as T;
}
