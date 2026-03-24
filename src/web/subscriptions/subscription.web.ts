import { type Request, type Response, Router } from 'express';
import { type PrismaClient } from '@prisma/client';

import { HttpError } from '../../shared/http-error';
import { SubscriptionService } from './subscription.service';
import { adminDecisionSchema, createSubscriptionRequestSchema } from './subscription.schema';
import { renderAdminPage, renderApprovalResultPage, renderPortalPage } from './subscription.templates';

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

      res.status(200).send(
        renderAdminPage({
          token,
          requests
        })
      );
    } catch (error) {
      next(error);
    }
  });

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

  return router;
}
