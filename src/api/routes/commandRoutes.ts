import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreateAccountCommandHandler } from '../../application/commands/CreateAccountHandler';
import { DepositMoneyCommandHandler }  from '../../application/commands/DepositMoneyHandler';
import { WithdrawMoneyCommandHandler } from '../../application/commands/WithdrawMoneyHandler';
import { CloseAccountCommandHandler }  from '../../application/commands/CloseAccountHandler';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const createAccountSchema = z.object({
  accountId:      z.string().min(1, 'accountId is required'),
  ownerName:      z.string().min(1, 'ownerName is required'),
  initialBalance: z.number().min(0, 'initialBalance must be >= 0').default(0),
  currency:       z.string().length(3, 'currency must be a 3-letter ISO code').default('USD'),
});

const depositSchema = z.object({
  amount:        z.number().positive('amount must be > 0'),
  description:   z.string().optional(),
  transactionId: z.string().min(1, 'transactionId is required'),
});

const withdrawSchema = z.object({
  amount:        z.number().positive('amount must be > 0'),
  description:   z.string().optional(),
  transactionId: z.string().min(1, 'transactionId is required'),
});

const closeAccountSchema = z.object({
  reason: z.string().min(1, 'reason is required'),
});

// ── Factory ──────────────────────────────────────────────────────────────────

export function createCommandRouter(deps: {
  createAccountHandler:  CreateAccountCommandHandler;
  depositMoneyHandler:   DepositMoneyCommandHandler;
  withdrawMoneyHandler:  WithdrawMoneyCommandHandler;
  closeAccountHandler:   CloseAccountCommandHandler;
}): Router {
  const router = Router();

  // ── POST /api/accounts ───────────────────────────────────────────────────
  router.post(
    '/',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = createAccountSchema.parse(req.body);
        await deps.createAccountHandler.handle(body);
        res.status(202).json({
          message:   'Account creation command accepted.',
          accountId: body.accountId,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /api/accounts/:accountId/deposit ────────────────────────────────
  router.post(
    '/:accountId/deposit',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = depositSchema.parse(req.body);
        await deps.depositMoneyHandler.handle({
          accountId: req.params.accountId,
          ...body,
        });
        res.status(202).json({ message: 'Deposit command accepted.' });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /api/accounts/:accountId/withdraw ───────────────────────────────
  router.post(
    '/:accountId/withdraw',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = withdrawSchema.parse(req.body);
        await deps.withdrawMoneyHandler.handle({
          accountId: req.params.accountId,
          ...body,
        });
        res.status(202).json({ message: 'Withdrawal command accepted.' });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /api/accounts/:accountId/close ─────────────────────────────────
  router.post(
    '/:accountId/close',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = closeAccountSchema.parse(req.body);
        await deps.closeAccountHandler.handle({
          accountId: req.params.accountId,
          reason:    body.reason,
        });
        res.status(202).json({ message: 'Account close command accepted.' });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
