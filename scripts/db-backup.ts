import 'dotenv/config';

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { toPostgresCliConnectionString } from './database-url';
import { resolvePostgresBinary } from './pg-bin';

function readFlag(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function buildDefaultBackupPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return resolve(process.cwd(), 'backups', `fluxo-${timestamp}.dump`);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const filePath = resolve(readFlag('--file') ?? buildDefaultBackupPath());
const pgDumpBinary = resolvePostgresBinary('pg_dump');
const cliConnectionString = toPostgresCliConnectionString(databaseUrl);

mkdirSync(resolve(filePath, '..'), { recursive: true });

const result = spawnSync(
  pgDumpBinary,
  ['--format=custom', '--no-owner', '--no-privileges', `--file=${filePath}`, cliConnectionString],
  {
    stdio: 'inherit',
    shell: false
  }
);

if (result.error) {
  console.error(`Failed to run pg_dump: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Database backup created at ${filePath}`);
