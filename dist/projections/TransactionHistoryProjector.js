"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionHistoryProjector = void 0;
/**
 * TransactionHistoryProjector
 *
 * Maintains the `transaction_history` read-model table.
 *
 * Only MoneyDeposited and MoneyWithdrawn events produce transaction records.
 * INSERT … ON CONFLICT DO NOTHING makes the handler naturally idempotent.
 */
class TransactionHistoryProjector {
    constructor(pool) {
        this.pool = pool;
    }
    async project(event, client) {
        const db = client ?? this.pool;
        switch (event.eventType) {
            case 'MoneyDeposited':
                await this.onMoneyDeposited(event, db);
                break;
            case 'MoneyWithdrawn':
                await this.onMoneyWithdrawn(event, db);
                break;
            default:
                break; // AccountCreated and AccountClosed are no-ops here
        }
    }
    // ── handlers ───────────────────────────────────────────────────────────────
    async onMoneyDeposited(event, db) {
        const d = event.eventData;
        await db.query(`INSERT INTO transaction_history
         (transaction_id, account_id, type, amount, description, timestamp)
       VALUES ($1, $2, 'DEPOSIT', $3, $4, $5)
       ON CONFLICT (transaction_id) DO NOTHING`, [
            d.transactionId,
            event.aggregateId,
            d.amount,
            d.description ?? null,
            event.timestamp.toISOString(),
        ]);
    }
    async onMoneyWithdrawn(event, db) {
        const d = event.eventData;
        await db.query(`INSERT INTO transaction_history
         (transaction_id, account_id, type, amount, description, timestamp)
       VALUES ($1, $2, 'WITHDRAWAL', $3, $4, $5)
       ON CONFLICT (transaction_id) DO NOTHING`, [
            d.transactionId,
            event.aggregateId,
            d.amount,
            d.description ?? null,
            event.timestamp.toISOString(),
        ]);
    }
    /** Wipe the read model (used during projection rebuild). */
    async truncate(db = this.pool) {
        await db.query('TRUNCATE transaction_history');
    }
}
exports.TransactionHistoryProjector = TransactionHistoryProjector;
//# sourceMappingURL=TransactionHistoryProjector.js.map