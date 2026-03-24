import { type Request, type Response, Router } from 'express';
import { type PrismaClient } from '@prisma/client';

import { HttpError } from '../../shared/http-error';
import { SubscriptionService } from './subscription.service';
import {
  adminDecisionSchema,
  createSubscriptionRequestSchema,
  updateSubscriptionModulesSchema
} from './subscription.schema';
import {
  renderAdminPage,
  renderApprovalResultPage,
  renderEditSubscriptionPage,
  renderPortalPage
} from './subscription.templates';

function readAdminToken(req: Request) {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const bodyToken = typeof req.body?.token === 'string' ? req.body.token : null;
  const headerToken =
    typeof req.headers['x-admin-token'] === 'string' ? req.headers['x-admin-token'] : null;

  return queryToken ?? bodyToken ?? headerToken;
}

function assertAdminToken(req: Request) {
  const expectedToken = process.env.ADMIN_APPROVAL_TOKEN;

  if (!expectedToken) {
    throw new HttpError(503, 'ADMIN_APPROVAL_TOKEN is not configured');
  }

  const providedToken = readAdminToken(req);

  if (!providedToken || providedToken !== expectedToken) {
    throw new HttpError(401, 'Invalid admin token');
  }

  return expectedToken;
}

function normalizeModules(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

export function createSubscriptionWebRouter(prisma: PrismaClient) {
  const router = Router();
  const subscriptionService = new SubscriptionService(prisma);

  router.get('/portal', async (req: Request, res: Response, next) => {
    try {
      const data = await subscriptionService.getPortalData();
      const presetCode = typeof req.query.preset === 'string' ? req.query.preset : null;
      const preset = presetCode ? data.plans.find((plan) => plan.code === presetCode) : null;
      const successMessage =
        req.query.submitted === '1'
          ? 'Votre demande a ete enregistree. L admin la traitera puis une cle pourra etre envoyee par email.'
          : null;

      res.status(200).send(
        renderPortalPage({
          ...data,
          successMessage,
          selectedPresetCode: preset?.code ?? null,
          values: preset
            ? {
                modules: [...preset.modules]
              }
            : undefined
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.post('/portal/subscribe', async (req: Request, res: Response, next) => {
    try {
      const payload = createSubscriptionRequestSchema.parse({
        companyName: req.body.companyName,
        email: req.body.email,
        notes: req.body.notes,
        modules: normalizeModules(req.body.modules)
      });

      await subscriptionService.createRequest(payload);
      res.redirect('/portal?submitted=1');
    } catch (error) {
      try {
        const data = await subscriptionService.getPortalData();
        res.status(400).send(
          renderPortalPage({
            ...data,
            errorMessage:
              error instanceof Error ? error.message : 'Impossible d enregistrer la demande.',
            values: {
              companyName: typeof req.body.companyName === 'string' ? req.body.companyName : '',
              email: typeof req.body.email === 'string' ? req.body.email : '',
              notes: typeof req.body.notes === 'string' ? req.body.notes : '',
              modules: normalizeModules(req.body.modules)
            }
          })
        );
      } catch (renderError) {
        next(renderError);
      }
    }
  });

  router.get('/admin/subscriptions', async (req: Request, res: Response, next) => {
    try {
      const token = assertAdminToken(req);
      const requests = await subscriptionService.listRequests();
      const message = typeof req.query.message === 'string' ? req.query.message : null;
      const errorMessage = typeof req.query.error === 'string' ? req.query.error : null;

      res.status(200).send(
        renderAdminPage({
          token,
          requests,
          message,
          errorMessage
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/admin/subscriptions/:id/edit',
    async (req: Request<{ id: string }>, res: Response, next) => {
      try {
        const token = assertAdminToken(req);
        const editable = await subscriptionService.getEditableSubscription(req.params.id);

        res.status(200).send(
          renderEditSubscriptionPage({
            token,
            request: editable,
            catalog: await subscriptionService.getPortalData().then((data) => data.modules),
            message: typeof req.query.message === 'string' ? req.query.message : null,
            errorMessage: typeof req.query.error === 'string' ? req.query.error : null
          })
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/admin/subscriptions/:id/approve',
    async (req: Request<{ id: string }>, res: Response, next) => {
      try {
        const token = assertAdminToken(req);
        const payload = adminDecisionSchema.parse({
          adminMessage: req.body.adminMessage
        });

        const result = await subscriptionService.approveRequest(req.params.id, payload);

        res.status(200).send(
          renderApprovalResultPage({
            token,
            companyName: result.request.companyName,
            email: result.request.email,
            modules: result.request.requestedModules,
            key: result.accessKey.plain,
            planName: result.plan.name,
            companySlug: result.company.slug,
            databaseName: result.database.name,
            emailSent: result.emailDelivery.sent,
            emailError: result.emailDelivery.sent ? null : result.emailDelivery.error,
            adminMessage: result.request.adminMessage,
            successMessage: 'Le retry a reussi. Une nouvelle cle a ete generee pour ce tenant.'
          })
        );
      } catch (error) {
        try {
          const token = assertAdminToken(req);
          const requests = await subscriptionService.listRequests();

          res.status(409).send(
            renderAdminPage({
              token,
              requests,
              errorMessage:
                error instanceof Error
                  ? `Le retry a echoue: ${error.message}`
                  : 'Le retry a echoue.'
            })
          );
        } catch (renderError) {
          next(renderError);
        }
      }
    }
  );

  router.post(
    '/admin/subscriptions/:id/modules',
    async (req: Request<{ id: string }>, res: Response, next) => {
      const token = assertAdminToken(req);

      try {
        const payload = updateSubscriptionModulesSchema.parse({
          modules: normalizeModules(req.body.modules),
          adminMessage: req.body.adminMessage
        });

        const result = await subscriptionService.updateSubscriptionModules(req.params.id, payload);
        res.redirect(
          `/admin/subscriptions?token=${encodeURIComponent(token)}&message=${encodeURIComponent(
            `Modules mis a jour pour ${result.companyName}.`
          )}`
        );
      } catch (error) {
        try {
          const editable = await subscriptionService.getEditableSubscription(req.params.id);

          res.status(400).send(
            renderEditSubscriptionPage({
              token,
              request: editable,
              catalog: await subscriptionService.getPortalData().then((data) => data.modules),
              errorMessage:
                error instanceof Error
                  ? `Impossible de mettre a jour les modules: ${error.message}`
                  : 'Impossible de mettre a jour les modules.',
              adminMessage: typeof req.body.adminMessage === 'string' ? req.body.adminMessage : null
            })
          );
        } catch (renderError) {
          next(renderError);
        }
      }
    }
  );

  router.post(
    '/admin/subscriptions/:id/resync',
    async (req: Request<{ id: string }>, res: Response, next) => {
      const token = assertAdminToken(req);

      try {
        const payload = adminDecisionSchema.parse({
          adminMessage: req.body.adminMessage
        });

        const result = await subscriptionService.resyncSubscriptionTenant(req.params.id, payload);
        res.redirect(
          `/admin/subscriptions?token=${encodeURIComponent(token)}&message=${encodeURIComponent(
            `Tenant resynchronise pour ${result.companyName}.`
          )}`
        );
      } catch (error) {
        try {
          const requests = await subscriptionService.listRequests();

          res.status(409).send(
            renderAdminPage({
              token,
              requests,
              errorMessage:
                error instanceof Error
                  ? `La resynchronisation a echoue: ${error.message}`
                  : 'La resynchronisation a echoue.'
            })
          );
        } catch (renderError) {
          next(renderError);
        }
      }
    }
  );

  router.post(
    '/admin/subscriptions/:id/reject',
    async (req: Request<{ id: string }>, res: Response, next) => {
      try {
        const token = assertAdminToken(req);
        const payload = adminDecisionSchema.parse({
          adminMessage: req.body.adminMessage
        });

        await subscriptionService.rejectRequest(req.params.id, payload);
        res.redirect(`/admin/subscriptions?token=${encodeURIComponent(token)}`);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/admin/subscriptions/:id/retry',
    async (req: Request<{ id: string }>, res: Response, next) => {
      try {
        const token = assertAdminToken(req);
        const payload = adminDecisionSchema.parse({
          adminMessage: req.body.adminMessage
        });

        const result = await subscriptionService.retryFailedRequest(req.params.id, payload);

        res.status(200).send(
          renderApprovalResultPage({
            token,
            companyName: result.request.companyName,
            email: result.request.email,
            modules: result.request.requestedModules,
            key: result.accessKey.plain,
            planName: result.plan.name,
            companySlug: result.company.slug,
            databaseName: result.database.name,
            emailSent: result.emailDelivery.sent,
            emailError: result.emailDelivery.sent ? null : result.emailDelivery.error,
            adminMessage: result.request.adminMessage
          })
        );
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
