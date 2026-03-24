import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTenantDatabaseName,
  buildTenantDatabaseUrl,
  slugifyCompanyName
} from './tenant-provisioning';

test('slugifyCompanyName normalizes accents and separators', () => {
  assert.equal(slugifyCompanyName('Kithub Burundi SARL'), 'kithub-burundi-sarl');
  assert.equal(slugifyCompanyName('École Générale / HQ'), 'ecole-generale-hq');
});

test('buildTenantDatabaseName applies the default prefix and optional suffix', () => {
  assert.equal(buildTenantDatabaseName('kithub'), 'fluxo_tenant_kithub');
  assert.equal(buildTenantDatabaseName('kithub', '2'), 'fluxo_tenant_kithub_2');
});

test('buildTenantDatabaseUrl swaps the database name and removes prisma schema params', () => {
  const url = buildTenantDatabaseUrl(
    'postgresql://postgres:secret@localhost:5432/fluxo_admin_db?schema=public',
    'fluxo_tenant_kithub'
  );

  assert.equal(url, 'postgresql://postgres:secret@localhost:5432/fluxo_tenant_kithub');
});
