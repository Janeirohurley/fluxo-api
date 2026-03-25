import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { CompanyProvisioningStatus, PrismaClient } from '@prisma/client';

import { TenantProvisioningService } from '../src/shared/tenancy';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const companySlug = readArg('--company');
const includeFailed = process.argv.includes('--include-failed');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl
  })
});

const tenantProvisioningService = new TenantProvisioningService(databaseUrl, process.cwd());

async function main() {
  const companyFilter = companySlug
    ? {
      company: {
        slug: companySlug
      }
    }
    : {};

  const statuses: Array<CompanyProvisioningStatus> = includeFailed ? ['ready', 'failed'] : ['ready'];

  const databases = await prisma.companyDatabase.findMany({
    where: {
      provisioningStatus: {
        in: statuses
      },
      ...companyFilter
    },
    include: {
      company: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (databases.length === 0) {
    console.log(
      JSON.stringify(
        {
          message: 'No tenant databases matched the sync criteria.',
          company: companySlug,
          includeFailed
        },
        null,
        2
      )
    );
    return;
  }

  const results: Array<{
    company: string;
    database: string;
    status: 'ready' | 'failed';
    message?: string;
  }> = [];

  for (const database of databases) {
    try {
      await prisma.companyDatabase.update({
        where: {
          companyId: database.companyId
        },
        data: {
          provisioningStatus: 'provisioning',
          lastProvisioningError: null
        }
      });

      await tenantProvisioningService.synchronizeTenantDatabase(database.connectionString);

      await prisma.companyDatabase.update({
        where: {
          companyId: database.companyId
        },
        data: {
          provisioningStatus: 'ready',
          provisionedAt: new Date(),
          lastProvisioningError: null
        }
      });

      results.push({
        company: database.company.slug,
        database: database.databaseName,
        status: 'ready'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await prisma.companyDatabase.update({
        where: {
          companyId: database.companyId
        },
        data: {
          provisioningStatus: 'failed',
          lastProvisioningError: message.slice(0, 1000)
        }
      });

      results.push({
        company: database.company.slug,
        database: database.databaseName,
        status: 'failed',
        message
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        synced: results.length,
        results
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
