import { randomBytes } from 'crypto';

import { type PrismaClient } from '@prisma/client';

import { getAccessKeyPrefix, generateAccessKeyValue, hashAccessKey } from '../../shared/access/access-key';
import { HttpError } from '../../shared/http-error';
import { sendSubscriptionApprovalEmail } from '../../shared/mail/mailer';
import { MODULE_CATALOG } from './module-catalog';
import {
  type AdminDecisionInput,
  type CreateSubscriptionRequestInput
} from './subscription.schema';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

export class SubscriptionService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPortalData() {
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

    return {
      plans: plans.map((plan) => ({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        modules: plan.modules.map((moduleAccess) => moduleAccess.moduleName)
      })),
      modules: MODULE_CATALOG
    };
  }

  async createRequest(input: CreateSubscriptionRequestInput) {
    return this.prisma.subscriptionRequest.create({
      data: {
        companyName: input.companyName,
        email: input.email,
        notes: input.notes,
        requestedModules: {
          create: input.modules.map((moduleName) => ({
            moduleName
          }))
        }
      },
      include: {
        requestedModules: {
          orderBy: {
            moduleName: 'asc'
          }
        }
      }
    });
  }

  async listRequests() {
    const requests = await this.prisma.subscriptionRequest.findMany({
      include: {
        requestedModules: {
          orderBy: {
            moduleName: 'asc'
          }
        },
        approvedPlan: true,
        approvedAccessKey: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return requests.map((request) => ({
      ...request,
      requestedModules: request.requestedModules.map((moduleAccess) => moduleAccess.moduleName)
    }));
  }

  async approveRequest(id: string, input: AdminDecisionInput) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        requestedModules: {
          orderBy: {
            moduleName: 'asc'
          }
        }
      }
    });

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (request.status !== 'pending') {
      throw new HttpError(409, 'This subscription request has already been processed');
    }

    const modules = request.requestedModules.map((moduleAccess) => moduleAccess.moduleName);
    const plainAccessKey = generateAccessKeyValue();
    const codeSuffix = randomBytes(4).toString('hex');
    const planCode = `custom-${slugify(request.companyName) || 'client'}-${codeSuffix}`;
    const planName = `${request.companyName} Custom Plan`;

    const result = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.accessPlan.create({
        data: {
          code: planCode,
          name: planName,
          description: `Custom subscription generated from request ${request.id}`,
          modules: {
            create: modules.map((moduleName) => ({
              moduleName
            }))
          }
        }
      });

      const accessKey = await tx.accessKey.create({
        data: {
          keyPrefix: getAccessKeyPrefix(plainAccessKey),
          keyHash: hashAccessKey(plainAccessKey),
          label: request.companyName,
          planId: plan.id
        }
      });

      const approvedRequest = await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: 'approved',
          approvedPlanId: plan.id,
          approvedAccessKeyId: accessKey.id,
          adminMessage: input.adminMessage,
          processedAt: new Date()
        }
      });

      return {
        plan,
        accessKey,
        request: approvedRequest
      };
    });

    const emailDelivery = await sendSubscriptionApprovalEmail({
      to: request.email,
      companyName: request.companyName,
      modules,
      accessKey: plainAccessKey,
      planName,
      adminMessage: input.adminMessage ?? null
    });

    await this.prisma.subscriptionRequest.update({
      where: {
        id: request.id
      },
      data: {
        emailSentAt: emailDelivery.sent ? new Date() : null,
        emailError: emailDelivery.sent ? null : emailDelivery.error
      }
    });

    return {
      request: {
        ...result.request,
        requestedModules: modules
      },
      plan: result.plan,
      accessKey: {
        plain: plainAccessKey,
        prefix: result.accessKey.keyPrefix
      },
      emailDelivery
    };
  }

  async rejectRequest(id: string, input: AdminDecisionInput) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        requestedModules: true
      }
    });

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (request.status !== 'pending') {
      throw new HttpError(409, 'This subscription request has already been processed');
    }

    const rejectedRequest = await this.prisma.subscriptionRequest.update({
      where: {
        id
      },
      data: {
        status: 'rejected',
        adminMessage: input.adminMessage,
        processedAt: new Date()
      }
    });

    return {
      ...rejectedRequest,
      requestedModules: request.requestedModules.map((moduleAccess) => moduleAccess.moduleName)
    };
  }
}
