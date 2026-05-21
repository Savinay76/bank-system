"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Infrastructure
const EventStore_1 = require("../infrastructure/EventStore");
const SnapshotStore_1 = require("../infrastructure/SnapshotStore");
// Projections
const ProjectionManager_1 = require("../projections/ProjectionManager");
// Repository
const BankAccountRepository_1 = require("../application/BankAccountRepository");
// Command handlers
const CreateAccountHandler_1 = require("../application/commands/CreateAccountHandler");
const DepositMoneyHandler_1 = require("../application/commands/DepositMoneyHandler");
const WithdrawMoneyHandler_1 = require("../application/commands/WithdrawMoneyHandler");
const CloseAccountHandler_1 = require("../application/commands/CloseAccountHandler");
// Query handlers
const GetAccountHandler_1 = require("../application/queries/GetAccountHandler");
const GetEventsHandler_1 = require("../application/queries/GetEventsHandler");
const GetBalanceAtHandler_1 = require("../application/queries/GetBalanceAtHandler");
const GetTransactionsHandler_1 = require("../application/queries/GetTransactionsHandler");
const GetProjectionStatusHandler_1 = require("../application/queries/GetProjectionStatusHandler");
const RebuildProjectionsHandler_1 = require("../application/queries/RebuildProjectionsHandler");
// Routes & middleware
const commandRoutes_1 = require("./routes/commandRoutes");
const queryRoutes_1 = require("./routes/queryRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("../infrastructure/database");
// ---------------------------------------------------------------------------
// Application factory
// ---------------------------------------------------------------------------
function createApp(pool) {
    const app = (0, express_1.default)();
    // ── Global middleware ─────────────────────────────────────────────────────
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // ── Dependency injection (manual IoC) ────────────────────────────────────
    const eventStore = new EventStore_1.EventStore(pool);
    const snapshotStore = new SnapshotStore_1.SnapshotStore(pool);
    const projMgr = new ProjectionManager_1.ProjectionManager(pool, eventStore);
    const repository = new BankAccountRepository_1.BankAccountRepository(eventStore, snapshotStore, projMgr);
    // Commands
    const createAccountHandler = new CreateAccountHandler_1.CreateAccountCommandHandler(repository, eventStore);
    const depositMoneyHandler = new DepositMoneyHandler_1.DepositMoneyCommandHandler(repository);
    const withdrawMoneyHandler = new WithdrawMoneyHandler_1.WithdrawMoneyCommandHandler(repository);
    const closeAccountHandler = new CloseAccountHandler_1.CloseAccountCommandHandler(repository);
    // Queries
    const getAccountHandler = new GetAccountHandler_1.GetAccountQueryHandler(pool);
    const getEventsHandler = new GetEventsHandler_1.GetEventsQueryHandler(eventStore);
    const getBalanceAtHandler = new GetBalanceAtHandler_1.GetBalanceAtQueryHandler(eventStore);
    const getTransactionsHandler = new GetTransactionsHandler_1.GetTransactionsQueryHandler(pool);
    const getProjectionStatusHandler = new GetProjectionStatusHandler_1.GetProjectionStatusQueryHandler(projMgr);
    const rebuildProjectionsHandler = new RebuildProjectionsHandler_1.RebuildProjectionsHandler(projMgr);
    // ── Health endpoint ───────────────────────────────────────────────────────
    app.get('/health', async (_req, res) => {
        const dbHealthy = await (0, database_1.checkDatabaseHealth)();
        const status = dbHealthy ? 'healthy' : 'degraded';
        res.status(dbHealthy ? 200 : 503).json({
            status,
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealthy ? 'up' : 'down',
            },
        });
    });
    // ── Command routes  (/api/accounts)  ─────────────────────────────────────
    app.use('/api/accounts', (0, commandRoutes_1.createCommandRouter)({
        createAccountHandler,
        depositMoneyHandler,
        withdrawMoneyHandler,
        closeAccountHandler,
    }));
    // ── Query routes ─────────────────────────────────────────────────────────
    // Projection-specific routes (no :accountId prefix)
    app.get('/api/projections/status', async (_req, res, next) => {
        try {
            const result = await getProjectionStatusHandler.handle();
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    app.post('/api/projections/rebuild', async (_req, res, next) => {
        try {
            const result = await rebuildProjectionsHandler.handle();
            res.status(202).json(result);
        }
        catch (err) {
            next(err);
        }
    });
    // Account query routes
    app.use('/api/accounts', (0, queryRoutes_1.createQueryRouter)({
        getAccountHandler,
        getEventsHandler,
        getBalanceAtHandler,
        getTransactionsHandler,
        getProjectionStatusHandler,
        rebuildProjectionsHandler,
    }));
    // ── 404 handler ───────────────────────────────────────────────────────────
    app.use((_req, res) => {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
    });
    // ── Global error handler ──────────────────────────────────────────────────
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map