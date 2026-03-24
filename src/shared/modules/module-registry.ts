import { type ApplicationModule } from './module.types';

export function filterEnabledModules(
  modules: ApplicationModule[],
  enabledModulesValue: string | undefined
) {
  if (!enabledModulesValue) {
    return modules;
  }

  const enabledModules = new Set(
    enabledModulesValue
      .split(',')
      .map((moduleName) => moduleName.trim().toLowerCase())
      .filter(Boolean)
  );

  return modules.filter((module) => enabledModules.has(module.name.toLowerCase()));
}
