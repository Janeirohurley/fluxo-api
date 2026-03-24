import { createAssetsRoutes } from './assets.routes';
import { AssetsController } from './assets.controller';
import { InMemoryAssetsRepository, PrismaAssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';
import { type ApplicationModule, type ModuleContext } from '../../shared/modules/module.types';
import { getRequiredTenantPrisma } from '../../shared/tenancy';

export function createAssetsModule(context: ModuleContext): ApplicationModule {
  const repository =
    context.prisma && context.env.ASSETS_STORAGE !== 'memory'
      ? new PrismaAssetsRepository(() => getRequiredTenantPrisma())
      : new InMemoryAssetsRepository();
  const service = new AssetsService(repository);
  const controller = new AssetsController(service);

  return {
    name: 'assets',
    version: '1.0.0',
    basePath: '/api/assets',
    requiresAccessKey: true,
    router: createAssetsRoutes(controller)
  };
}
