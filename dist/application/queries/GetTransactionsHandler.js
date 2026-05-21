"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTransactionsQueryHandler = void 0;
const errors_1 = require("../../domain/errors");
/**
 * GetTransactionsQueryHandler
 *
 * Returns a paginated list of transactions from the `transaction_history`
 * read model. Only reads from the projection — never from the event store.
 */
class GetTransactionsQueryHandler {
    constructor(pool) {
        this.pool = pool;
    }
    async handle(accountId, page = 1, pageSize = 10) {
        // Validate account exists in projection
        const { rows: check } = await this.pool.query('SELECT 1 FROM account_summaries WHERE account_id = $1', [accountId]);
        if (check.length === 0) {
            throw new errors_1.NotFoundError(`Account '${accountId}' not found.`);
        }
        const safePage = Math.max(1, page);
        const safePageSize = Math.min(Math.max(1, pageSize), 100);
        const offset = (safePage - 1) * safePageSize;
        const [countResult, rowsResult] = await Promise.all([
            this.pool.query('SELECT COUNT(*)::TEXT AS cnt FROM transaction_history WHERE account_id = $1', [accountId]),
            this.pool.query(`SELECT transaction_id, type, amount, description, timestamp
           FROM transaction_history
          WHERE account_id = $1
          ORDER BY timestamp DESC
          LIMIT $2 OFFSET $3`, [accountId, safePageSize, offset]),
        ]);
        const totalCount = Number(countResult.rows[0].cnt);
        const totalPages = Math.ceil(totalCount / safePageSize) || 1;
        return {
            currentPage: safePage,
            pageSize: safePageSize,
            totalPages,
            totalCount,
            items: rowsResult.rows.map(r => ({
                transactionId: r.transaction_id,
                type: r.type,
                amount: Number(r.amount),
                description: r.description ?? null,
                timestamp: new Date(r.timestamp).toISOString(),
            })),
        };
    }
}
exports.GetTransactionsQueryHandler = GetTransactionsQueryHandler;
//# sourceMappingURL=GetTransactionsHandler.js.map