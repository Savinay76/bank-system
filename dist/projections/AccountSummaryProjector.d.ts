import { Pool, PoolClient } from 'pg';
import { DomainEvent } from '../domain/events/types';
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
export declare class AccountSummaryProjector {
    private readonly pool;
    constructor(pool: Pool);
    project(event: DomainEvent, client?: PoolClient): Promise<void>;
    private onAccountCreated;
    private onMoneyDeposited;
    private onMoneyWithdrawn;
    private onAccountClosed;
    /** Wipe the read model (used during projection rebuild). */
    truncate(db?: Pool | PoolClient): Promise<void>;
}
