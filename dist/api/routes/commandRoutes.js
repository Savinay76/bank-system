"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommandRouter = createCommandRouter;
const express_1 = require("express");
const zod_1 = require("zod");
// ── Zod schemas ──────────────────────────────────────────────────────────────
const createAccountSchema = zod_1.z.object({
    accountId: zod_1.z.string().min(1, 'accountId is required'),
    ownerName: zod_1.z.string().min(1, 'ownerName is required'),
    initialBalance: zod_1.z.number().min(0, 'initialBalance must be >= 0').default(0),
    currency: zod_1.z.string().length(3, 'currency must be a 3-letter ISO code').default('USD'),
});
const depositSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('amount must be > 0'),
    description: zod_1.z.string().optional(),
    transactionId: zod_1.z.string().min(1, 'transactionId is required'),
});
const withdrawSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('amount must be > 0'),
    description: zod_1.z.string().optional(),
    transactionId: zod_1.z.string().min(1, 'transactionId is required'),
});
const closeAccountSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, 'reason is required'),
});
// ── Factory ──────────────────────────────────────────────────────────────────
function createCommandRouter(deps) {
    const router = (0, express_1.Router)();
    // ── POST /api/accounts ───────────────────────────────────────────────────
    router.post('/', async (req, res, next) => {
        try {
            const body = createAccountSchema.parse(req.body);
            await deps.createAccountHandler.handle(body);
            res.status(202).json({
                message: 'Account creation command accepted.',
                accountId: body.accountId,
            });
        }
        catch (err) {
            next(err);
        }
    });
    // ── POST /api/accounts/:accountId/deposit ────────────────────────────────
    router.post('/:accountId/deposit', async (req, res, next) => {
        try {
            const body = depositSchema.parse(req.body);
            await deps.depositMoneyHandler.handle({
                accountId: req.params.accountId,
                ...body,
            });
            res.status(202).json({ message: 'Deposit command accepted.' });
        }
        catch (err) {
            next(err);
        }
    });
    // ── POST /api/accounts/:accountId/withdraw ───────────────────────────────
    router.post('/:accountId/withdraw', async (req, res, next) => {
        try {
            const body = withdrawSchema.parse(req.body);
            await deps.withdrawMoneyHandler.handle({
                accountId: req.params.accountId,
                ...body,
            });
            res.status(202).json({ message: 'Withdrawal command accepted.' });
        }
        catch (err) {
            next(err);
        }
    });
    // ── POST /api/accounts/:accountId/close ─────────────────────────────────
    router.post('/:accountId/close', async (req, res, next) => {
        try {
            const body = closeAccountSchema.parse(req.body);
            await deps.closeAccountHandler.handle({
                accountId: req.params.accountId,
                reason: body.reason,
            });
            res.status(202).json({ message: 'Account close command accepted.' });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=commandRoutes.js.map