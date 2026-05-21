"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountQueryHandler = void 0;
const errors_1 = require("../../domain/errors");
/**
 * GetAccountQueryHandler
 *
 * Reads from the `account_summaries` read model (projection).
 * Never touches the event store.
 */
class GetAccountQueryHandler {
    constructor(pool) {
        this.pool = pool;
    }
    async handle(accountId) {
        const { rows } = await this.pool.query(`SELECT account_id, owner_name, balance, currency, status
         FROM account_summaries
        WHERE account_id = $1`, [accountId]);
        if (rows.length === 0) {
            throw new errors_1.NotFoundError(`Account '${accountId}' not found.`);
        }
        const row = rows[0];
        return {
            accountId: row.account_id,
            ownerName: row.owner_name,
            balance: Number(row.balance),
            currency: row.currency,
            status: row.status,
        };
    }
}
exports.GetAccountQueryHandler = GetAccountQueryHandler;
//# sourceMappingURL=GetAccountHandler.js.map