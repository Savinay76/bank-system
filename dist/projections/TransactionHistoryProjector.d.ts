import { Pool, PoolClient } from 'pg';
import { DomainEvent } from '../domain/events/types';
/**
 * TransactionHistoryProjector
 *
 * Maintains the `transaction_history` read-model table.
 *
 * Only MoneyDeposited and MoneyWithdrawn events produce transaction records.
 * INSERT … ON CONFLICT DO NOTHING makes the handler naturally idempotent.
 */
export declare class TransactionHistoryProjector {
    private readonly pool;
    constructor(pool: Pool);
    project(event: DomainEvent, client?: PoolClient): Promise<void>;
    private onMoneyDeposited;
    private onMoneyWithdrawn;
    /** Wipe the read model (used during projection rebuild). */
    truncate(db?: Pool | PoolClient): Promise<void>;
}
