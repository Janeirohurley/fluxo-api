import { type Router } from 'express';

import { type PrismaClientLike } from '../prisma';

export type ModuleContext = Readonly<{
  env: NodeJS.ProcessEnv;
  prisma: PrismaClientLike | null;
}>;

export type ApplicationModule = Readonly<{
  name: string;
  version: string;
  basePath: `/api/${string}`;
  requiresAccessKey: boolean;
  router: Router;
}>;
