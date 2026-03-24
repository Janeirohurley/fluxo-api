import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl
  })
});

async function main() {
  const plans = await prisma.accessPlan.findMany({
    include: {
      modules: {
        orderBy: {
          moduleName: 'asc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  for (const plan of plans) {
    console.log(`${plan.code} | ${plan.name} | modules=${plan.modules.map((item) => item.moduleName).join(',')}`);
  }
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
