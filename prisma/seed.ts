import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl
  })
});

async function main() {
  const planDefinitions = [
    {
      code: 'assets-starter',
      name: 'Assets Starter',
      description: 'Access to the assets module only',
      modules: ['assets']
    },
    {
      code: 'finance-starter',
      name: 'Finance Starter',
      description: 'Access to the finance module only',
      modules: ['finance']
    },
    {
      code: 'people-starter',
      name: 'People Starter',
      description: 'Access to the employees module only',
      modules: ['employees']
    },
    {
      code: 'payroll-starter',
      name: 'Payroll Starter',
      description: 'Access to the payroll module only',
      modules: ['payroll']
    },
    {
      code: 'business-suite',
      name: 'Business Suite',
      description: 'Access to all currently available modules',
      modules: ['assets', 'finance', 'employees', 'payroll']
    }
  ];

  for (const definition of planDefinitions) {
    const plan = await prisma.accessPlan.upsert({
      where: {
        code: definition.code
      },
      update: {
        name: definition.name,
        description: definition.description,
        isActive: true
      },
      create: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        isActive: true
      }
    });

    for (const moduleName of definition.modules) {
      await prisma.accessPlanModule.upsert({
        where: {
          planId_moduleName: {
            planId: plan.id,
            moduleName
          }
        },
        update: {},
        create: {
          planId: plan.id,
          moduleName
        }
      });
    }
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
