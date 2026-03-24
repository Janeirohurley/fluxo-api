import 'dotenv/config';

import { existsSync } from 'node:fs';
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

const databaseUrl = process.env.DATABASE_URL;
const filePath = readFlag('--file');

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

if (!filePath) {
  console.error('Provide the backup file with --file <path>.');
  process.exit(1);
}

const resolvedPath = resolve(filePath);
const pgRestoreBinary = resolvePostgresBinary('pg_restore');
const cliConnectionString = toPostgresCliConnectionString(databaseUrl);

if (!existsSync(resolvedPath)) {
  console.error(`Backup file not found: ${resolvedPath}`);
  process.exit(1);
}

const result = spawnSync(
  pgRestoreBinary,
  ['--clean', '--if-exists', '--no-owner', '--no-privileges', `--dbname=${cliConnectionString}`, resolvedPath],
  {
    stdio: 'inherit',
    shell: false
  }
);

if (result.error) {
  console.error(`Failed to run pg_restore: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Database restored from ${resolvedPath}`);
