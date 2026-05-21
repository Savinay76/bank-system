"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryRouter = createQueryRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(10),
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
function createQueryRouter(deps) {
    const router = (0, express_1.Router)();
    // ── GET /api/accounts/:accountId/events ──────────────────────────────────
    router.get('/:accountId/events', async (req, res, next) => {
        try {
            const result = await deps.getEventsHandler.handle(req.params.accountId);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    // ── GET /api/accounts/:accountId/balance-at/:timestamp ───────────────────
    router.get('/:accountId/balance-at/:timestamp', async (req, res, next) => {
        try {
            const result = await deps.getBalanceAtHandler.handle(req.params.accountId, req.params.timestamp);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    // ── GET /api/accounts/:accountId/transactions ─────────────────────────────
    router.get('/:accountId/transactions', async (req, res, next) => {
        try {
            const { page, pageSize } = paginationSchema.parse(req.query);
            const result = await deps.getTransactionsHandler.handle(req.params.accountId, page, pageSize);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    // ── GET /api/accounts/:accountId  (catch-all – must be LAST) ─────────────
    router.get('/:accountId', async (req, res, next) => {
        try {
            const result = await deps.getAccountHandler.handle(req.params.accountId);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=queryRoutes.js.map