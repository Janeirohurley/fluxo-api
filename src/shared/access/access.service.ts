import { type PrismaClient } from '@prisma/client';

import { HttpError } from '../http-error';
import { hashAccessKey } from './access-key';
import { type AccessSession } from './access.types';

export class AccessService {
  constructor(private readonly prisma: PrismaClient) {}

  async listActivePlans() {
    const plans = await this.prisma.accessPlan.findMany({
      where: {
        isActive: true
      },
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

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      modules: plan.modules.map((moduleAccess) => moduleAccess.moduleName)
    }));
  }

  async resolveAccessKey(rawKey: string): Promise<AccessSession> {
    const keyHash = hashAccessKey(rawKey);
    const accessKey = await this.prisma.accessKey.findUnique({
      where: {
        keyHash
      },
      include: {
        company: true,
        plan: {
          include: {
            modules: {
              orderBy: {
                moduleName: 'asc'
              }
            }
          }
        }
      }
    });

    if (!accessKey || !accessKey.isActive) {
      throw new HttpError(401, 'Invalid access key');
    }

    if (!accessKey.plan.isActive) {
      throw new HttpError(403, 'The plan attached to this access key is inactive');
    }

    if (accessKey.company && !accessKey.company.isActive) {
      throw new HttpError(403, 'The company attached to this access key is inactive');
    }

    if (accessKey.expiresAt && accessKey.expiresAt.getTime() < Date.now()) {
      throw new HttpError(403, 'This access key has expired');
    }

    return {
      keyId: accessKey.id,
      keyPrefix: accessKey.keyPrefix,
      label: accessKey.label,
      expiresAt: accessKey.expiresAt?.toISOString() ?? null,
      company: accessKey.company
        ? {
            id: accessKey.company.id,
            slug: accessKey.company.slug,
            name: accessKey.company.name
          }
        : null,
      plan: {
        id: accessKey.plan.id,
        code: accessKey.plan.code,
        name: accessKey.plan.name,
        description: accessKey.plan.description
      },
      modules: accessKey.plan.modules.map((moduleAccess) => moduleAccess.moduleName)
    };
  }

  async assertModuleAccess(rawKey: string, moduleName: string): Promise<AccessSession> {
    const session = await this.resolveAccessKey(rawKey);

    if (!session.modules.includes(moduleName)) {
      throw new HttpError(403, `Your access key does not allow the "${moduleName}" module`);
    }

    await this.touchAccessKey(session.keyId);
    return session;
  }

  async touchAccessKey(keyId: string) {
    await this.prisma.accessKey.update({
      where: {
        id: keyId
      },
      data: {
        lastUsedAt: new Date()
      }
    });
  }
}
