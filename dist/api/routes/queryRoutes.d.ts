import { Router } from 'express';
import { GetAccountQueryHandler } from '../../application/queries/GetAccountHandler';
import { GetEventsQueryHandler } from '../../application/queries/GetEventsHandler';
import { GetBalanceAtQueryHandler } from '../../application/queries/GetBalanceAtHandler';
import { GetTransactionsQueryHandler } from '../../application/queries/GetTransactionsHandler';
import { GetProjectionStatusQueryHandler } from '../../application/queries/GetProjectionStatusHandler';
import { RebuildProjectionsHandler } from '../../application/queries/RebuildProjectionsHandler';
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
export declare function createQueryRouter(deps: {
    getAccountHandler: GetAccountQueryHandler;
    getEventsHandler: GetEventsQueryHandler;
    getBalanceAtHandler: GetBalanceAtQueryHandler;
    getTransactionsHandler: GetTransactionsQueryHandler;
    getProjectionStatusHandler: GetProjectionStatusQueryHandler;
    rebuildProjectionsHandler: RebuildProjectionsHandler;
}): Router;
