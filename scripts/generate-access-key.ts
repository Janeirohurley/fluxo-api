import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { generateAccessKeyValue, getAccessKeyPrefix, hashAccessKey } from '../src/shared/access/access-key';

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

const planCode = readArg('--plan');
const label = readArg('--label');
const expiresAtRaw = readArg('--expires-at');

if (!planCode) {
  throw new Error('Usage: pnpm access:key:generate -- --plan <plan-code> [--label <name>] [--expires-at 2026-12-31]');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl
  })
});

async function main() {
  const plan = await prisma.accessPlan.findUnique({
    where: {
      code: planCode
    },
    include: {
      company: true,
      modules: {
        orderBy: {
          moduleName: 'asc'
        }
      }
    }
  });

  if (!plan || !plan.isActive) {
    throw new Error(`Plan "${planCode}" does not exist or is inactive.`);
  }

  const accessKey = generateAccessKeyValue();

  const created = await prisma.accessKey.create({
    data: {
      keyPrefix: getAccessKeyPrefix(accessKey),
      keyHash: hashAccessKey(accessKey),
      label,
      planId: plan.id,
      companyId: plan.companyId ?? null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null
    }
  });

  console.log(JSON.stringify({
    key: accessKey,
    keyPrefix: created.keyPrefix,
    plan: {
      code: plan.code,
      name: plan.name
    },
    company: plan.company
      ? {
          slug: plan.company.slug,
          name: plan.company.name
        }
      : null,
    modules: plan.modules.map((moduleAccess) => moduleAccess.moduleName),
    expiresAt: created.expiresAt?.toISOString() ?? null
  }, null, 2));
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
