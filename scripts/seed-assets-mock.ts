import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function toDecimal(value: number) {
  return Number(value.toFixed(2));
}

function createPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString
    })
  });
}

const adminDatabaseUrl = process.env.DATABASE_URL;

if (!adminDatabaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const companySlug = readArg('--company');
const count = Number(readArg('--count') ?? 12);

if (!companySlug) {
  throw new Error('Please provide --company <slug>. Example: pnpm run tenant:seed:assets -- --company combinator-2');
}

if (!Number.isFinite(count) || count <= 0 || count > 200) {
  throw new Error('--count must be a positive number between 1 and 200.');
}

const adminPrisma = createPrismaClient(adminDatabaseUrl);

const ASSET_NAMES = [
  ['Dell Latitude 5440', 'Dell', 'Latitude 5440'],
  ['HP ProBook 450', 'HP', 'ProBook 450'],
  ['Lenovo ThinkPad E14', 'Lenovo', 'ThinkPad E14'],
  ['Toyota Hilux', 'Toyota', 'Hilux'],
  ['Canon iR 2425', 'Canon', 'iR 2425'],
  ['Cisco Router RV340', 'Cisco', 'RV340'],
  ['Epson EcoTank L3250', 'Epson', 'EcoTank L3250'],
  ['Samsung Galaxy Tab A9', 'Samsung', 'Galaxy Tab A9'],
  ['Office Desk Premium', 'IKEA', 'Bekant'],
  ['Warehouse Shelf Rack', 'Generic', 'Rack 4x2']
] as const;

const MAINTENANCE_DESCRIPTIONS = [
  'Preventive inspection',
  'Battery replacement',
  'Engine tune-up',
  'General servicing',
  'Corrective maintenance'
] as const;

async function ensureTenantReferenceData(tenantPrisma: PrismaClient) {
  for (const name of ['IT Equipment', 'Vehicles', 'Furniture', 'Buildings']) {
    await tenantPrisma.assetCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['active', 'inactive', 'maintenance', 'disposed']) {
    await tenantPrisma.assetStatus.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of ['preventive', 'corrective', 'inspection']) {
    await tenantPrisma.interventionType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

function createAssetPayload(index: number, categories: string[], statuses: string[]) {
  const [name, brand, model] = ASSET_NAMES[index % ASSET_NAMES.length];
  const purchaseValue = [850, 1200, 1450, 42000, 650, 980, 310, 420, 260, 5400][
    index % 10
  ];
  const residualValue = purchaseValue * 0.18;
  const statusName = statuses[index % statuses.length] ?? 'active';
  const categoryId = categories[index % categories.length];
  const acquisitionDate = new Date(Date.UTC(2025, index % 12, 5 + (index % 20)));

  return {
    inventoryCode: `AST-MOCK-${String(index + 1).padStart(3, '0')}`,
    name,
    brand,
    model,
    serialNumber: `SN-MOCK-${String(index + 1).padStart(5, '0')}`,
    categoryId,
    statusName,
    finance: {
      acquisitionDate,
      purchaseValue: toDecimal(purchaseValue),
      estimatedLifeYears: [3, 4, 5, 7][index % 4],
      residualValue: toDecimal(residualValue)
    }
  };
}

async function main() {
  const companyDatabase = await adminPrisma.companyDatabase.findFirst({
    where: {
      company: {
        slug: companySlug ?? ''
      },
      provisioningStatus: 'ready'
    },
    include: {
      company: true
    }
  });

  if (!companyDatabase) {
    throw new Error(`No ready tenant database found for company "${companySlug}".`);
  }

  const tenantPrisma = createPrismaClient(companyDatabase.connectionString);

  try {
    await ensureTenantReferenceData(tenantPrisma);

    const [categories, statuses, interventionTypes] = await Promise.all([
      tenantPrisma.assetCategory.findMany({ orderBy: { name: 'asc' } }),
      tenantPrisma.assetStatus.findMany({ orderBy: { name: 'asc' } }),
      tenantPrisma.interventionType.findMany({ orderBy: { name: 'asc' } })
    ]);

    const activeStatus = statuses.find((status) => status.name === 'active') ?? statuses[0];
    const maintenanceStatus =
      statuses.find((status) => status.name === 'maintenance') ?? activeStatus;
    const inactiveStatus =
      statuses.find((status) => status.name === 'inactive') ?? activeStatus;
    const disposedStatus =
      statuses.find((status) => status.name === 'disposed') ?? activeStatus;

    const statusCycle = [
      activeStatus?.name ?? 'active',
      activeStatus?.name ?? 'active',
      maintenanceStatus?.name ?? 'maintenance',
      inactiveStatus?.name ?? 'inactive',
      activeStatus?.name ?? 'active',
      disposedStatus?.name ?? 'disposed'
    ];

    const categoryIds = categories.map((category) => category.id);

    const seededAssetIds: string[] = [];
    let maintenanceLogsCreated = 0;

    for (let index = 0; index < count; index += 1) {
      const payload = createAssetPayload(index, categoryIds, statusCycle);
      const status = statuses.find((entry) => entry.name === payload.statusName) ?? activeStatus;

      const asset = await tenantPrisma.asset.upsert({
        where: {
          inventoryCode: payload.inventoryCode
        },
        update: {
          name: payload.name,
          brand: payload.brand,
          model: payload.model,
          serialNumber: payload.serialNumber,
          categoryId: payload.categoryId,
          statusId: status.id
        },
        create: {
          inventoryCode: payload.inventoryCode,
          name: payload.name,
          brand: payload.brand,
          model: payload.model,
          serialNumber: payload.serialNumber,
          categoryId: payload.categoryId,
          statusId: status.id
        }
      });

      seededAssetIds.push(asset.id);

      await tenantPrisma.assetFinanceData.upsert({
        where: {
          assetId: asset.id
        },
        update: {
          acquisitionDate: payload.finance.acquisitionDate,
          purchaseValue: payload.finance.purchaseValue,
          estimatedLifeYears: payload.finance.estimatedLifeYears,
          residualValue: payload.finance.residualValue
        },
        create: {
          assetId: asset.id,
          acquisitionDate: payload.finance.acquisitionDate,
          purchaseValue: payload.finance.purchaseValue,
          estimatedLifeYears: payload.finance.estimatedLifeYears,
          residualValue: payload.finance.residualValue
        }
      });

      const shouldCreateMaintenance =
        payload.statusName === 'maintenance' || index % 3 === 0 || index % 5 === 0;

      if (shouldCreateMaintenance && interventionTypes.length > 0) {
        const interventionType = interventionTypes[index % interventionTypes.length];

        await tenantPrisma.maintenanceLog.create({
          data: {
            assetId: asset.id,
            interventionTypeId: interventionType.id,
            description: MAINTENANCE_DESCRIPTIONS[index % MAINTENANCE_DESCRIPTIONS.length],
            interventionCost: toDecimal(25 + (index % 7) * 18),
            provider: index % 2 === 0 ? 'Internal IT' : 'External Supplier'
          }
        });

        maintenanceLogsCreated += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          company: companyDatabase.company.slug,
          database: companyDatabase.databaseName,
          seededAssets: seededAssetIds.length,
          maintenanceLogsCreated,
          inventoryCodesPreview: Array.from({ length: Math.min(count, 5) }, (_value, index) =>
            `AST-MOCK-${String(index + 1).padStart(3, '0')}`
          )
        },
        null,
        2
      )
    );
  } finally {
    await tenantPrisma.$disconnect();
  }
}

main()
  .then(async () => {
    await adminPrisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await adminPrisma.$disconnect();
    process.exit(1);
  });
