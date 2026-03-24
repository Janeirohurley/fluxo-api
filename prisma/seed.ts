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

  for (const name of ['IT Equipment', 'Vehicles', 'Furniture', 'Buildings']) {
    await prisma.assetCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['active', 'inactive', 'maintenance', 'disposed']) {
    await prisma.assetStatus.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['preventive', 'corrective', 'inspection']) {
    await prisma.interventionType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['bank-transfer', 'cash', 'mobile-money', 'card']) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['income', 'expense', 'transfer', 'adjustment']) {
    await prisma.transactionType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const account of [
    { code: '1000', name: 'Cash and Cash Equivalents', accountType: 'asset' },
    { code: '1100', name: 'Accounts Receivable', accountType: 'asset' },
    { code: '2000', name: 'Accounts Payable', accountType: 'liability' },
    { code: '4000', name: 'Operating Revenue', accountType: 'revenue' },
    { code: '5000', name: 'Operating Expense', accountType: 'expense' }
  ]) {
    await prisma.accountingAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        accountType: account.accountType,
        isActive: true
      },
      create: {
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        isActive: true
      }
    });
  }

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
