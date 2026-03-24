import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { type PrismaClientLike } from '../prisma';

export class TenantPrismaManager {
  private readonly clients = new Map<string, PrismaClientLike>();

  async getClient(connectionString: string) {
    const cached = this.clients.get(connectionString);

    if (cached) {
      return cached;
    }

    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString
      }),
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });

    this.clients.set(connectionString, client);
    return client;
  }
}
