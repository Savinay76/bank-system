"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSummaryProjector = void 0;
/**
 * AccountSummaryProjector
 *
 * Maintains the `account_summaries` read-model table.
 * All mutations are idempotent:
 *  - AccountCreated   → INSERT … ON CONFLICT DO NOTHING
 *  - MoneyDeposited   → UPDATE balance += amount (guarded by event_number)
 *  - MoneyWithdrawn   → UPDATE balance -= amount (guarded by event_number)
 *  - AccountClosed    → UPDATE status = 'CLOSED'
 *
 * The `version` column tracks the highest event_number applied,
 * preventing stale / duplicate event processing.
 */
class AccountSummaryProjector {
    constructor(pool) {
        this.pool = pool;
    }
    async project(event, client) {
        const db = client ?? this.pool;
        switch (event.eventType) {
            case 'AccountCreated':
                await this.onAccountCreated(event, db);
                break;
            case 'MoneyDeposited':
                await this.onMoneyDeposited(event, db);
                break;
            case 'MoneyWithdrawn':
                await this.onMoneyWithdrawn(event, db);
                break;
            case 'AccountClosed':
                await this.onAccountClosed(event, db);
                break;
        }
    }
    // ── handlers ───────────────────────────────────────────────────────────────
    async onAccountCreated(event, db) {
        const d = event.eventData;
        await db.query(`INSERT INTO account_summaries
         (account_id, owner_name, balance, currency, status, version)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)
       ON CONFLICT (account_id) DO NOTHING`, [d.accountId, d.ownerName, d.initialBalance, d.currency, event.eventNumber]);
    }
    async onMoneyDeposited(event, db) {
        const d = event.eventData;
        await db.query(`UPDATE account_summaries
          SET balance = balance + $1,
              version = $2
        WHERE account_id = $3
          AND version < $2`, // idempotency guard
        [d.amount, event.eventNumber, event.aggregateId]);
    }
    async onMoneyWithdrawn(event, db) {
        const d = event.eventData;
        await db.query(`UPDATE account_summaries
          SET balance = balance - $1,
              version = $2
        WHERE account_id = $3
          AND version < $2`, [d.amount, event.eventNumber, event.aggregateId]);
    }
    async onAccountClosed(event, db) {
        await db.query(`UPDATE account_summaries
          SET status  = 'CLOSED',
              version = $1
        WHERE account_id = $2
          AND version < $1`, [event.eventNumber, event.aggregateId]);
    }
    /** Wipe the read model (used during projection rebuild). */
    async truncate(db = this.pool) {
        await db.query('TRUNCATE account_summaries');
    }
}
exports.AccountSummaryProjector = AccountSummaryProjector;
//# sourceMappingURL=AccountSummaryProjector.js.map