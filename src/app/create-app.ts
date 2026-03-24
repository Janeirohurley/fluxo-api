import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';

import { createOpenApiDocument } from '../docs/openapi';
import { createModules } from '../modules';
import { createOverviewRouter } from '../overview';
import { AccessService, createGeneralAccessMiddleware, createModuleAccessMiddleware } from '../shared/access';
import { AuditService } from '../shared/audit/audit.service';
import { replaceRequestSection, toCamelCaseRequest } from '../shared/http/request-case';
import { createRateLimitMiddleware, InMemoryRateLimiter } from '../shared/http/rate-limit';
import { toSnakeCaseResponse } from '../shared/http/response-case';
import { HttpError } from '../shared/http-error';
import { RequestMetricsStore } from '../shared/observability/request-metrics';
import { prisma } from '../shared/prisma';
import { createSubscriptionWebRouter } from '../web/subscriptions/subscription.web';

export function createApp() {
  const app = express();
  const modules = createModules({
    env: process.env,
    prisma
  });
  const openApiDocument = createOpenApiDocument();
  const accessService = prisma ? new AccessService(prisma) : null;
  const auditService = prisma ? new AuditService(prisma) : null;
  const metricsStore = new RequestMetricsStore();
  const rateLimiter =
    process.env.RATE_LIMIT_ENABLED === 'false'
      ? null
      : new InMemoryRateLimiter({
          windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
          maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120)
        });
  const moduleDocs = modules.map(({ name, basePath, version, requiresAccessKey }) => ({
    name,
    version,
    basePath,
    requiresAccessKey,
    ...(['assets', 'finance'].includes(name) ? { docsPath: `${basePath}/docs` } : {})
  }));
  app.locals.prisma = prisma;

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      replaceRequestSection(req.body, toCamelCaseRequest(req.body));
    }

    if (req.query && typeof req.query === 'object') {
      replaceRequestSection(req.query, toCamelCaseRequest(req.query));
    }

    if (req.params && typeof req.params === 'object') {
      replaceRequestSection(req.params, toCamelCaseRequest(req.params));
    }

    next();
  });
  app.use((_req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      if (res.locals.skipResponseCaseTransform) {
        return originalJson(body);
      }

      return originalJson(toSnakeCaseResponse(body));
    }) as Response['json'];

    next();
  });
  app.use((req, res, next) => {
    const requestId =
      typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length > 0
        ? req.headers['x-request-id']
        : randomUUID();
    const startedAt = Date.now();

    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const entry = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      };

      if (res.statusCode >= 500) {
        console.error(JSON.stringify({ level: 'error', ...entry }));
      } else if (res.statusCode >= 400) {
        console.warn(JSON.stringify({ level: 'warn', ...entry }));
      } else {
        console.info(JSON.stringify({ level: 'info', ...entry }));
      }

      metricsStore.record(entry);

      if (auditService) {
        void auditService.recordHttpMutation(req, res).catch((error) => {
          console.error(
            JSON.stringify({
              level: 'error',
              requestId,
              message: error instanceof Error ? error.message : 'Failed to write audit log'
            })
          );
        });
      }
    });

    next();
  });

  if (rateLimiter) {
    app.use(
      createRateLimitMiddleware(
        rateLimiter,
        (req) =>
          req.path.startsWith('/api') &&
          req.path !== '/api/access/plans' &&
          req.path !== '/openapi.json'
      )
    );
  }

  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'fluxo-api',
      message: 'Welcome to Fluxo API',
      docs: {
        health: '/health',
        metrics: '/metrics',
        modules: '/modules',
        overview: '/api/overview',
        portal: '/portal',
        adminSubscriptions: '/admin/subscriptions?token=<ADMIN_APPROVAL_TOKEN>',
        assets: '/api/assets/docs',
        accessPlans: '/api/access/plans',
        accessMe: '/api/access/me',
        swagger: '/docs/',
        openApi: '/openapi.json'
      },
      modules: moduleDocs
    });
  });

  app.get('/health', async (_req, res, next) => {
    try {
      let database: {
        status: 'ok' | 'disabled' | 'error';
        message?: string;
      } = {
        status: prisma ? 'ok' : 'disabled'
      };

      if (prisma) {
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
          database = {
            status: 'error',
            message: error instanceof Error ? error.message : 'Database check failed'
          };
        }
      }

      const overallStatus = database.status === 'error' ? 'degraded' : 'ok';

      res.status(database.status === 'error' ? 503 : 200).json({
        status: overallStatus,
        service: 'fluxo-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database,
        rateLimit: rateLimiter
          ? {
              enabled: true,
              ...rateLimiter.snapshot()
            }
          : {
              enabled: false
            },
        metrics: metricsStore.getSnapshot().totals,
        modules: moduleDocs
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/metrics', (_req, res) => {
    res.type('text/plain').send(metricsStore.renderPrometheus());
  });

  app.get('/observability', (_req, res) => {
    res.status(200).json({
      data: metricsStore.getSnapshot()
    });
  });

  app.get('/modules', (_req, res) => {
    res.status(200).json({
      data: moduleDocs
    });
  });

  app.get('/api/access/plans', async (_req, res, next) => {
    try {
      if (!accessService) {
        throw new HttpError(503, 'Access key service is unavailable because Prisma is not configured');
      }

      res.status(200).json({
        data: await accessService.listActivePlans()
      });
    } catch (error) {
      next(error);
    }
  });

  app.get(
    '/api/access/me',
    ...(accessService ? [createGeneralAccessMiddleware(accessService)] : []),
    (req, res) => {
      res.status(200).json({
        data: res.locals.accessSession ?? null
      });
    }
  );

  if (accessService) {
    app.use(
      '/api/overview',
      createGeneralAccessMiddleware(accessService),
      createOverviewRouter(modules.map((module) => module.name as 'assets' | 'finance' | 'employees' | 'payroll'))
    );
  }

  app.get('/openapi.json', (_req, res) => {
    res.locals.skipResponseCaseTransform = true;
    res.status(200).json(openApiDocument);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  if (prisma) {
    app.use(createSubscriptionWebRouter(prisma));
  }

  for (const module of modules) {
    if (module.requiresAccessKey) {
      if (!accessService) {
        throw new Error(`Cannot protect module "${module.name}" because Prisma is not configured`);
      }

      app.use(module.basePath, createModuleAccessMiddleware(accessService, module.name), module.router);
      continue;
    }

    app.use(module.basePath, module.router);
  }

  app.use((_req, _res, next) => {
    next(new HttpError(404, 'Route not found'));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        requestId: res.locals.requestId ?? null,
        issues: error.flatten()
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
        requestId: res.locals.requestId ?? null,
        details: error.details ?? null
      });
    }

    console.error(
      JSON.stringify({
        level: 'error',
        requestId: res.locals.requestId ?? null,
        message: error instanceof Error ? error.message : 'Unexpected error',
        stack: error instanceof Error ? error.stack : undefined
      })
    );

    return res.status(500).json({
      message: 'Internal server error',
      requestId: res.locals.requestId ?? null
    });
  });

  return {
    app,
    modules
  };
}
