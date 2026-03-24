export function slugifyCompanyName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function buildTenantDatabaseName(companySlug: string, suffix?: string | null) {
  const prefix = process.env.TENANT_DATABASE_PREFIX?.trim() || 'fluxo_tenant';
  const normalizedSlug = slugifyCompanyName(companySlug || 'client') || 'client';
  const normalizedSuffix = suffix?.trim() ? `_${suffix.trim().toLowerCase()}` : '';

  return `${prefix}_${normalizedSlug}${normalizedSuffix}`.slice(0, 63);
}

export function buildTenantDatabaseUrl(adminDatabaseUrl: string, databaseName: string) {
  const parsed = new URL(adminDatabaseUrl);

  parsed.pathname = `/${databaseName}`;
  parsed.searchParams.delete('schema');

  return parsed.toString();
}
