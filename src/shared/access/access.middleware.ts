import { type NextFunction, type Request, type Response } from 'express';

import { HttpError } from '../http-error';
import { readAccessKeyFromHeaders } from './access-key';
import { AccessService } from './access.service';

function getRequiredAccessKey(req: Request) {
  const key = readAccessKeyFromHeaders(req.headers);

  if (!key) {
    throw new HttpError(
      401,
      'Missing access key. Provide x-module-key, x-api-key, or Authorization: Bearer <key>'
    );
  }

  return key;
}

export function createModuleAccessMiddleware(accessService: AccessService, moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRequiredAccessKey(req);
      res.locals.accessSession = await accessService.assertModuleAccess(key, moduleName);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createGeneralAccessMiddleware(accessService: AccessService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRequiredAccessKey(req);
      res.locals.accessSession = await accessService.resolveAccessKey(key);
      next();
    } catch (error) {
      next(error);
    }
  };
}
