import { Request, Response, NextFunction } from 'express';
import i18next, { initI18n } from '../../i18n/i18n';

/**
 * Middleware pour détecter la langue de la requête (header, query, etc.)
 * et configurer i18next dynamiquement.
 */
export async function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  // Détection de la langue (ordre de priorité : query, header, défaut)
  const lang = req.query.lang || req.headers['accept-language']?.toString().split(',')[0] || 'fr';
  await initI18n(lang as string);
  // Optionnel : stocker la langue sur la requête pour usage ultérieur
  (req as any).t = i18next.t.bind(i18next);
  next();
}
