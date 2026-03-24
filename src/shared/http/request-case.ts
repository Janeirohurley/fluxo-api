function toCamelCaseKey(value: string) {
  return value.replace(/[_-\s]+([a-zA-Z0-9])/g, (_match, group: string) => group.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function toCamelCaseRequest<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCaseRequest(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entryValue]) => {
    result[toCamelCaseKey(key)] = toCamelCaseRequest(entryValue);
    return result;
  }, {}) as T;
}

export function replaceRequestSection<T extends object>(
  target: T | undefined,
  source: T
) {
  if (!target || typeof target !== 'object') {
    return source;
  }

  for (const key of Object.keys(target)) {
    delete (target as Record<string, unknown>)[key];
  }

  Object.assign(target, source);
  return target;
}
