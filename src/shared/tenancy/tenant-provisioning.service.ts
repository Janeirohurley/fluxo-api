import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Client } from 'pg';

const execAsync = promisify(exec);

type ProvisionTenantDatabaseInput = {
  databaseName: string;
  connectionString: string;
};

export class TenantProvisioningService {
  constructor(
    private readonly adminDatabaseUrl: string,
    private readonly projectRoot = process.cwd()
  ) {}

  async provisionTenantDatabase(input: ProvisionTenantDatabaseInput) {
    await this.createDatabaseIfMissing(input.databaseName);
    await this.synchronizeTenantDatabase(input.connectionString);
  }

  async synchronizeTenantDatabase(connectionString: string) {
    await this.pushTenantSchema(connectionString);
    await this.seedTenantReferenceData(connectionString);
  }

  private async createDatabaseIfMissing(databaseName: string) {
    const client = new Client({
      connectionString: this.adminDatabaseUrl
    });

    await client.connect();

    try {
      const existing = await client.query<{ datname: string }>(
        'SELECT datname FROM pg_database WHERE datname = $1',
        [databaseName]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        return;
      }

      const escapedDatabaseName = databaseName.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${escapedDatabaseName}"`);
    } finally {
      await client.end();
    }
  }

  private async pushTenantSchema(connectionString: string) {
    const prismaBinary = join(
      this.projectRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prisma.CMD' : 'prisma'
    );

    await execAsync(
      `"${prismaBinary}" db push --config prisma.tenant.config.ts`,
      {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          DATABASE_URL: connectionString
        },
        shell: process.env.ComSpec ?? undefined
      }
    );
  }

  private async seedTenantReferenceData(connectionString: string) {
    const client = new Client({
      connectionString
    });

    await client.connect();

    try {
      for (const name of ['IT Equipment', 'Vehicles', 'Furniture', 'Buildings']) {
        await client.query(
          `
            INSERT INTO categories (id, name, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
          `,
          [randomUUID(), name]
        );
      }

      for (const name of ['active', 'inactive', 'maintenance', 'disposed']) {
        await client.query(
          `
            INSERT INTO statuses (id, name, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
          `,
          [randomUUID(), name]
        );
      }

      for (const name of ['preventive', 'corrective', 'inspection']) {
        await client.query(
          `
            INSERT INTO intervention_types (id, name, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
          `,
          [randomUUID(), name]
        );
      }
    } finally {
      await client.end();
    }
  }
}
