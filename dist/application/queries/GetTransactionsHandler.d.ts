import { Pool } from 'pg';
export interface TransactionPage {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    items: TransactionItem[];
}
export interface TransactionItem {
    transactionId: string;
    type: string;
    amount: number;
    description: string | null;
    timestamp: string;
}
/**
 * GetTransactionsQueryHandler
 *
 * Returns a paginated list of transactions from the `transaction_history`
 * read model. Only reads from the projection — never from the event store.
 */
export declare class GetTransactionsQueryHandler {
    private readonly pool;
    constructor(pool: Pool);
    handle(accountId: string, page?: number, pageSize?: number): Promise<TransactionPage>;
}
