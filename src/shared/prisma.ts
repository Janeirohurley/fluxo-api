import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
  var __fluxoPrisma__: PrismaClient | undefined;
}

export type PrismaClientLike = PrismaClient;

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  });
}

export const prisma = global.__fluxoPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  global.__fluxoPrisma__ = prisma;
}
