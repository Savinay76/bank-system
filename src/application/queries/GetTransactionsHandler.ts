import { Pool } from 'pg';
import { NotFoundError } from '../../domain/errors';

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
export class GetTransactionsQueryHandler {
  constructor(private readonly pool: Pool) {}

  async handle(
    accountId: string,
    page = 1,
    pageSize = 10,
  ): Promise<TransactionPage> {
    // Validate account exists in projection
    const { rows: check } = await this.pool.query(
      'SELECT 1 FROM account_summaries WHERE account_id = $1',
      [accountId],
    );
    if (check.length === 0) {
      throw new NotFoundError(`Account '${accountId}' not found.`);
    }

    const safePage     = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const offset       = (safePage - 1) * safePageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query(
        'SELECT COUNT(*)::TEXT AS cnt FROM transaction_history WHERE account_id = $1',
        [accountId],
      ),
      this.pool.query(
        `SELECT transaction_id, type, amount, description, timestamp
           FROM transaction_history
          WHERE account_id = $1
          ORDER BY timestamp DESC
          LIMIT $2 OFFSET $3`,
        [accountId, safePageSize, offset],
      ),
    ]);

    const totalCount = Number(countResult.rows[0].cnt);
    const totalPages = Math.ceil(totalCount / safePageSize) || 1;

    return {
      currentPage: safePage,
      pageSize:    safePageSize,
      totalPages,
      totalCount,
      items: rowsResult.rows.map(r => ({
        transactionId: r.transaction_id as string,
        type:          r.type as string,
        amount:        Number(r.amount),
        description:   (r.description as string | null) ?? null,
        timestamp:     new Date(r.timestamp as string).toISOString(),
      })),
    };
  }
}
