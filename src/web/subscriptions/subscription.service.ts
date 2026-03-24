import { randomBytes } from 'crypto';

import { type PrismaClient } from '@prisma/client';

import { getAccessKeyPrefix, generateAccessKeyValue, hashAccessKey } from '../../shared/access/access-key';
import { HttpError } from '../../shared/http-error';
import { sendSubscriptionApprovalEmail } from '../../shared/mail/mailer';
import {
  buildTenantDatabaseName,
  buildTenantDatabaseUrl,
  slugifyCompanyName,
  TenantProvisioningService
} from '../../shared/tenancy';
import { MODULE_CATALOG } from './module-catalog';
import {
  type AdminDecisionInput,
  type CreateSubscriptionRequestInput,
  type UpdateSubscriptionModulesInput
} from './subscription.schema';

export class SubscriptionService {
  private readonly tenantProvisioningService: TenantProvisioningService | null;

  constructor(private readonly prisma: PrismaClient) {
    this.tenantProvisioningService = process.env.DATABASE_URL
      ? new TenantProvisioningService(process.env.DATABASE_URL)
      : null;
  }

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
        approvedCompany: {
          include: {
            database: true
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

  async getEditableSubscription(id: string) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        requestedModules: {
          orderBy: {
            moduleName: 'asc'
          }
        },
        approvedCompany: {
          include: {
            database: true
          }
        },
        approvedPlan: {
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

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (!['approved', 'failed'].includes(request.status)) {
      throw new HttpError(409, 'Only approved or failed subscriptions can be edited');
    }

    if (!request.approvedPlan || !request.approvedCompany) {
      throw new HttpError(409, 'This subscription does not yet have a provisioned company and plan');
    }

    return {
      id: request.id,
      companyName: request.companyName,
      email: request.email,
      status: request.status as 'approved' | 'failed',
      modules: request.approvedPlan.modules.map((moduleAccess) => moduleAccess.moduleName),
      companySlug: request.approvedCompany.slug,
      databaseName: request.approvedCompany.database?.databaseName ?? null,
      adminMessage: request.adminMessage
    };
  }

  async approveRequest(id: string, input: AdminDecisionInput) {
    if (!process.env.DATABASE_URL || !this.tenantProvisioningService) {
      throw new HttpError(503, 'DATABASE_URL is required to provision a tenant database');
    }

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
    const companySlug = await this.generateUniqueCompanySlug(request.companyName);
    const databaseName = await this.generateUniqueDatabaseName(companySlug);
    const connectionString = buildTenantDatabaseUrl(process.env.DATABASE_URL, databaseName);
    const planCode = `custom-${companySlug || 'client'}-${codeSuffix}`;
    const planName = `${request.companyName} Custom Plan`;

    const provisioningContext = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          slug: companySlug,
          name: request.companyName
        }
      });

      const companyDatabase = await tx.companyDatabase.create({
        data: {
          companyId: company.id,
          databaseName,
          connectionString,
          provisioningStatus: 'provisioning'
        }
      });

      const plan = await tx.accessPlan.create({
        data: {
          code: planCode,
          name: planName,
          description: `Custom subscription generated from request ${request.id}`,
          companyId: company.id,
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
          planId: plan.id,
          companyId: company.id
        }
      });

      const subscriptionRequest = await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: 'provisioning',
          approvedPlanId: plan.id,
          approvedCompanyId: company.id,
          approvedAccessKeyId: accessKey.id,
          adminMessage: input.adminMessage
        }
      });

      return {
        company,
        companyDatabase,
        plan,
        accessKey,
        request: subscriptionRequest
      };
    });

    try {
      await this.tenantProvisioningService.provisionTenantDatabase({
        databaseName: provisioningContext.companyDatabase.databaseName,
        connectionString: provisioningContext.companyDatabase.connectionString
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.companyDatabase.update({
          where: {
            companyId: provisioningContext.company.id
          },
          data: {
            provisioningStatus: 'failed',
            lastProvisioningError:
              error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning error'
          }
        });

        await tx.company.update({
          where: {
            id: provisioningContext.company.id
          },
          data: {
            isActive: false
          }
        });

        await tx.accessKey.update({
          where: {
            id: provisioningContext.accessKey.id
          },
          data: {
            isActive: false
          }
        });

        await tx.subscriptionRequest.update({
          where: {
            id: request.id
          },
          data: {
            status: 'failed',
            processedAt: new Date(),
            emailError:
              error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning error'
          }
        });
      });

      throw new HttpError(
        500,
        `The tenant database could not be provisioned for ${request.companyName}`,
        {
          companySlug,
          databaseName,
          cause: error instanceof Error ? error.message : String(error)
        }
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.companyDatabase.update({
        where: {
          companyId: provisioningContext.company.id
        },
        data: {
          provisioningStatus: 'ready',
          provisionedAt: new Date(),
          lastProvisioningError: null
        }
      });

      const approvedRequest = await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: 'approved',
          processedAt: new Date(),
          emailError: null
        }
      });

      return {
        company: provisioningContext.company,
        companyDatabase: provisioningContext.companyDatabase,
        plan: provisioningContext.plan,
        accessKey: provisioningContext.accessKey,
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
      company: {
        id: result.company.id,
        slug: result.company.slug,
        name: result.company.name
      },
      database: {
        name: result.companyDatabase.databaseName
      },
      plan: result.plan,
      accessKey: {
        plain: plainAccessKey,
        prefix: result.accessKey.keyPrefix
      },
      emailDelivery
    };
  }

  async retryFailedRequest(id: string, input: AdminDecisionInput) {
    if (!process.env.DATABASE_URL || !this.tenantProvisioningService) {
      throw new HttpError(503, 'DATABASE_URL is required to provision a tenant database');
    }

    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        requestedModules: {
          orderBy: {
            moduleName: 'asc'
          }
        },
        approvedCompany: {
          include: {
            database: true
          }
        },
        approvedPlan: true,
        approvedAccessKey: true
      }
    });

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (request.status !== 'failed') {
      throw new HttpError(409, 'Only failed subscription requests can be retried');
    }

    if (!request.approvedCompany || !request.approvedCompany.database || !request.approvedPlan) {
      throw new HttpError(
        409,
        'This failed request is missing its company, database, or plan context and cannot be retried'
      );
    }

    const modules = request.requestedModules.map((moduleAccess) => moduleAccess.moduleName);
    const plainAccessKey = generateAccessKeyValue();

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: 'provisioning',
          adminMessage: input.adminMessage,
          emailError: null
        }
      });

      await tx.companyDatabase.update({
        where: {
          companyId: request.approvedCompanyId!
        },
        data: {
          provisioningStatus: 'provisioning',
          lastProvisioningError: null
        }
      });
    });

    try {
      await this.tenantProvisioningService.provisionTenantDatabase({
        databaseName: request.approvedCompany.database.databaseName,
        connectionString: request.approvedCompany.database.connectionString
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: {
            id: request.approvedCompany!.id
          },
          data: {
            isActive: false
          }
        });

        await tx.companyDatabase.update({
          where: {
            companyId: request.approvedCompany!.id
          },
          data: {
            provisioningStatus: 'failed',
            lastProvisioningError:
              error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning error'
          }
        });

        await tx.subscriptionRequest.update({
          where: {
            id: request.id
          },
          data: {
            status: 'failed',
            processedAt: new Date(),
            emailError:
              error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning error'
          }
        });
      });

      throw new HttpError(
        500,
        `The tenant database retry failed for ${request.companyName}`,
        {
          companySlug: request.approvedCompany.slug,
          databaseName: request.approvedCompany.database.databaseName,
          cause: error instanceof Error ? error.message : String(error)
        }
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (request.approvedAccessKeyId) {
        await tx.accessKey.updateMany({
          where: {
            id: request.approvedAccessKeyId
          },
          data: {
            isActive: false
          }
        });
      }

      const newAccessKey = await tx.accessKey.create({
        data: {
          keyPrefix: getAccessKeyPrefix(plainAccessKey),
          keyHash: hashAccessKey(plainAccessKey),
          label: request.companyName,
          planId: request.approvedPlan!.id,
          companyId: request.approvedCompany!.id
        }
      });

      await tx.company.update({
        where: {
          id: request.approvedCompany!.id
        },
        data: {
          isActive: true
        }
      });

      await tx.companyDatabase.update({
        where: {
          companyId: request.approvedCompany!.id
        },
        data: {
          provisioningStatus: 'ready',
          provisionedAt: new Date(),
          lastProvisioningError: null
        }
      });

      const approvedRequest = await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: 'approved',
          approvedAccessKeyId: newAccessKey.id,
          adminMessage: input.adminMessage,
          processedAt: new Date(),
          emailError: null
        }
      });

      return {
        request: approvedRequest,
        accessKey: newAccessKey
      };
    });

    const emailDelivery = await sendSubscriptionApprovalEmail({
      to: request.email,
      companyName: request.companyName,
      modules,
      accessKey: plainAccessKey,
      planName: request.approvedPlan.name,
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
      company: {
        id: request.approvedCompany.id,
        slug: request.approvedCompany.slug,
        name: request.approvedCompany.name
      },
      database: {
        name: request.approvedCompany.database.databaseName
      },
      plan: request.approvedPlan,
      accessKey: {
        plain: plainAccessKey,
        prefix: result.accessKey.keyPrefix
      },
      emailDelivery
    };
  }

  async updateSubscriptionModules(id: string, input: UpdateSubscriptionModulesInput) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        approvedCompany: {
          include: {
            database: true
          }
        },
        approvedPlan: {
          include: {
            modules: true
          }
        }
      }
    });

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (!['approved', 'failed'].includes(request.status)) {
      throw new HttpError(409, 'Only approved or failed subscriptions can be edited');
    }

    if (!request.approvedPlan || !request.approvedCompany || !request.approvedCompany.database) {
      throw new HttpError(409, 'This subscription is missing its plan or tenant database context');
    }

    if (this.tenantProvisioningService) {
      await this.tenantProvisioningService.synchronizeTenantDatabase(
        request.approvedCompany.database.connectionString
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.accessPlanModule.deleteMany({
        where: {
          planId: request.approvedPlanId!
        }
      });

      await tx.accessPlanModule.createMany({
        data: input.modules.map((moduleName) => ({
          planId: request.approvedPlanId!,
          moduleName
        }))
      });

      await tx.subscriptionRequestModule.deleteMany({
        where: {
          requestId: request.id
        }
      });

      await tx.subscriptionRequestModule.createMany({
        data: input.modules.map((moduleName) => ({
          requestId: request.id,
          moduleName
        }))
      });

      await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          adminMessage: input.adminMessage,
          updatedAt: new Date()
        }
      });
    });

    return {
      requestId: request.id,
      companyName: request.companyName,
      modules: input.modules
    };
  }

  async resyncSubscriptionTenant(id: string, input: AdminDecisionInput) {
    if (!this.tenantProvisioningService) {
      throw new HttpError(503, 'DATABASE_URL is required to synchronize a tenant database');
    }

    const request = await this.prisma.subscriptionRequest.findUnique({
      where: {
        id
      },
      include: {
        approvedCompany: {
          include: {
            database: true
          }
        }
      }
    });

    if (!request) {
      throw new HttpError(404, 'Subscription request not found');
    }

    if (request.status !== 'approved') {
      throw new HttpError(409, 'Only approved subscriptions can be resynchronized');
    }

    if (!request.approvedCompany || !request.approvedCompany.database) {
      throw new HttpError(409, 'This subscription does not have a tenant database to resync');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.companyDatabase.update({
        where: {
          companyId: request.approvedCompany!.id
        },
        data: {
          provisioningStatus: 'provisioning',
          lastProvisioningError: null
        }
      });

      await tx.subscriptionRequest.update({
        where: {
          id: request.id
        },
        data: {
          adminMessage: input.adminMessage
        }
      });
    });

    try {
      await this.tenantProvisioningService.synchronizeTenantDatabase(
        request.approvedCompany.database.connectionString
      );
    } catch (error) {
      await this.prisma.companyDatabase.update({
        where: {
          companyId: request.approvedCompany.id
        },
        data: {
          provisioningStatus: 'failed',
          lastProvisioningError:
            error instanceof Error ? error.message.slice(0, 1000) : 'Unknown sync error'
        }
      });

      throw new HttpError(500, `The tenant resync failed for ${request.companyName}`, {
        companySlug: request.approvedCompany.slug,
        databaseName: request.approvedCompany.database.databaseName,
        cause: error instanceof Error ? error.message : String(error)
      });
    }

    await this.prisma.companyDatabase.update({
      where: {
        companyId: request.approvedCompany.id
      },
      data: {
        provisioningStatus: 'ready',
        provisionedAt: new Date(),
        lastProvisioningError: null
      }
    });

    return {
      companyName: request.companyName,
      companySlug: request.approvedCompany.slug,
      databaseName: request.approvedCompany.database.databaseName
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

  private async generateUniqueCompanySlug(companyName: string) {
    const baseSlug = slugifyCompanyName(companyName) || 'client';
    let candidate = baseSlug;
    let counter = 2;

    while (await this.prisma.company.findUnique({ where: { slug: candidate } })) {
      candidate = `${baseSlug}-${counter}`.slice(0, 32);
      counter += 1;
    }

    return candidate;
  }

  private async generateUniqueDatabaseName(companySlug: string) {
    let candidate = buildTenantDatabaseName(companySlug);
    let counter = 2;

    while (
      await this.prisma.companyDatabase.findUnique({
        where: {
          databaseName: candidate
        }
      })
    ) {
      candidate = buildTenantDatabaseName(companySlug, String(counter));
      counter += 1;
    }

    return candidate;
  }
}
