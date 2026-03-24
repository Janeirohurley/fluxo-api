import { existsSync } from 'node:fs';
import { join } from 'node:path';

function getPathEntries() {
  return (process.env.PATH ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCandidates(binaryName: string) {
  const executableName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  const candidates = new Set<string>();

  if (process.env.PG_BIN_DIR) {
    candidates.add(join(process.env.PG_BIN_DIR, executableName));
  }

  for (const entry of getPathEntries()) {
    candidates.add(join(entry, executableName));
  }

  if (process.platform === 'win32') {
    const postgresVersions = ['17', '16', '15', '14', '13', '12'];

    for (const version of postgresVersions) {
      candidates.add(join('C:\\Program Files\\PostgreSQL', version, 'bin', executableName));
      candidates.add(join('C:\\Program Files\\PostgreSQL', version, 'pgAdmin 4', 'runtime', executableName));
    }
  }

  return Array.from(candidates);
}

export function resolvePostgresBinary(binaryName: string) {
  const match = buildCandidates(binaryName).find((candidate) => existsSync(candidate));

  if (!match) {
    throw new Error(
      `Unable to locate ${binaryName}. Configure PG_BIN_DIR or add PostgreSQL bin to PATH.`
    );
  }

  return match;
}
