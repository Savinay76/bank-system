import { Pool } from 'pg';
export interface AccountSummary {
    accountId: string;
    ownerName: string;
    balance: number;
    currency: string;
    status: string;
}
/**
 * GetAccountQueryHandler
 *
 * Reads from the `account_summaries` read model (projection).
 * Never touches the event store.
 */
export declare class GetAccountQueryHandler {
    private readonly pool;
    constructor(pool: Pool);
    handle(accountId: string): Promise<AccountSummary>;
}
