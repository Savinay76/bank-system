import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Infrastructure
import { EventStore }    from '../infrastructure/EventStore';
import { SnapshotStore } from '../infrastructure/SnapshotStore';

// Projections
import { ProjectionManager } from '../projections/ProjectionManager';

// Repository
import { BankAccountRepository } from '../application/BankAccountRepository';

// Command handlers
import { CreateAccountCommandHandler } from '../application/commands/CreateAccountHandler';
import { DepositMoneyCommandHandler }  from '../application/commands/DepositMoneyHandler';
import { WithdrawMoneyCommandHandler } from '../application/commands/WithdrawMoneyHandler';
import { CloseAccountCommandHandler }  from '../application/commands/CloseAccountHandler';

// Query handlers
import { GetAccountQueryHandler }          from '../application/queries/GetAccountHandler';
import { GetEventsQueryHandler }           from '../application/queries/GetEventsHandler';
import { GetBalanceAtQueryHandler }        from '../application/queries/GetBalanceAtHandler';
import { GetTransactionsQueryHandler }     from '../application/queries/GetTransactionsHandler';
import { GetProjectionStatusQueryHandler } from '../application/queries/GetProjectionStatusHandler';
import { RebuildProjectionsHandler }       from '../application/queries/RebuildProjectionsHandler';

// Routes & middleware
import { createCommandRouter } from './routes/commandRoutes';
import { createQueryRouter }   from './routes/queryRoutes';
import { errorHandler }        from './middleware/errorHandler';
import { checkDatabaseHealth } from '../infrastructure/database';

// ---------------------------------------------------------------------------
// Application factory
// ---------------------------------------------------------------------------
export function createApp(pool: Pool): Application {
  const app = express();

  // ── Global middleware ─────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Dependency injection (manual IoC) ────────────────────────────────────
  const eventStore    = new EventStore(pool);
  const snapshotStore = new SnapshotStore(pool);
  const projMgr       = new ProjectionManager(pool, eventStore);
  const repository    = new BankAccountRepository(eventStore, snapshotStore, projMgr);

  // Commands
  const createAccountHandler  = new CreateAccountCommandHandler(repository, eventStore);
  const depositMoneyHandler   = new DepositMoneyCommandHandler(repository);
  const withdrawMoneyHandler  = new WithdrawMoneyCommandHandler(repository);
  const closeAccountHandler   = new CloseAccountCommandHandler(repository);

  // Queries
  const getAccountHandler          = new GetAccountQueryHandler(pool);
  const getEventsHandler           = new GetEventsQueryHandler(eventStore);
  const getBalanceAtHandler        = new GetBalanceAtQueryHandler(eventStore);
  const getTransactionsHandler     = new GetTransactionsQueryHandler(pool);
  const getProjectionStatusHandler = new GetProjectionStatusQueryHandler(projMgr);
  const rebuildProjectionsHandler  = new RebuildProjectionsHandler(projMgr);

  // ── Health endpoint ───────────────────────────────────────────────────────
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealthy = await checkDatabaseHealth();
    const status    = dbHealthy ? 'healthy' : 'degraded';
    res.status(dbHealthy ? 200 : 503).json({
      status,
      timestamp:  new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
    });
  });

  // ── Command routes  (/api/accounts)  ─────────────────────────────────────
  app.use(
    '/api/accounts',
    createCommandRouter({
      createAccountHandler,
      depositMoneyHandler,
      withdrawMoneyHandler,
      closeAccountHandler,
    }),
  );

  // ── Query routes ─────────────────────────────────────────────────────────
  // Projection-specific routes (no :accountId prefix)
  app.get('/api/projections/status', async (_req, res, next) => {
    try {
      const result = await getProjectionStatusHandler.handle();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/projections/rebuild', async (_req, res, next) => {
    try {
      const result = await rebuildProjectionsHandler.handle();
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Account query routes
  app.use(
    '/api/accounts',
    createQueryRouter({
      getAccountHandler,
      getEventsHandler,
      getBalanceAtHandler,
      getTransactionsHandler,
      getProjectionStatusHandler,
      rebuildProjectionsHandler,
    }),
  );

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
