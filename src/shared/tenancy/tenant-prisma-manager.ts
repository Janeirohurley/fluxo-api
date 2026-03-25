import { createTenantPrismaClient, type TenantPrismaClientLike } from '../tenant-prisma';

export class TenantPrismaManager {
  private readonly clients = new Map<string, TenantPrismaClientLike>();

  async getClient(connectionString: string) {
    const cached = this.clients.get(connectionString);

    if (cached) {
      return cached;
    }

    const client = createTenantPrismaClient(connectionString);

    this.clients.set(connectionString, client);
    return client;
  }
}
