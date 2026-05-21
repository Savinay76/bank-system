import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GetAccountQueryHandler }          from '../../application/queries/GetAccountHandler';
import { GetEventsQueryHandler }           from '../../application/queries/GetEventsHandler';
import { GetBalanceAtQueryHandler }        from '../../application/queries/GetBalanceAtHandler';
import { GetTransactionsQueryHandler }     from '../../application/queries/GetTransactionsHandler';
import { GetProjectionStatusQueryHandler } from '../../application/queries/GetProjectionStatusHandler';
import { RebuildProjectionsHandler }       from '../../application/queries/RebuildProjectionsHandler';

const paginationSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * Account-scoped query routes, all mounted under /api/accounts.
 *
 * Router ordering matters in Express: more-specific paths (with extra
 * segments or literal words) must come BEFORE the bare /:accountId catch-all
 * so that they are matched first.
 *
 * Projection routes (/api/projections/*) are intentionally NOT here —
 * they are registered at the app level in app.ts to avoid colliding with
 * the :accountId wildcard.
 */
export function createQueryRouter(deps: {
  getAccountHandler:          GetAccountQueryHandler;
  getEventsHandler:           GetEventsQueryHandler;
  getBalanceAtHandler:        GetBalanceAtQueryHandler;
  getTransactionsHandler:     GetTransactionsQueryHandler;
  getProjectionStatusHandler: GetProjectionStatusQueryHandler;
  rebuildProjectionsHandler:  RebuildProjectionsHandler;
}): Router {
  const router = Router();

  // ── GET /api/accounts/:accountId/events ──────────────────────────────────
  router.get(
    '/:accountId/events',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await deps.getEventsHandler.handle(req.params.accountId);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // ── GET /api/accounts/:accountId/balance-at/:timestamp ───────────────────
  router.get(
    '/:accountId/balance-at/:timestamp',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await deps.getBalanceAtHandler.handle(
          req.params.accountId,
          req.params.timestamp,
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // ── GET /api/accounts/:accountId/transactions ─────────────────────────────
  router.get(
    '/:accountId/transactions',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page, pageSize } = paginationSchema.parse(req.query);
        const result = await deps.getTransactionsHandler.handle(
          req.params.accountId,
          page,
          pageSize,
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // ── GET /api/accounts/:accountId  (catch-all – must be LAST) ─────────────
  router.get(
    '/:accountId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await deps.getAccountHandler.handle(req.params.accountId);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
