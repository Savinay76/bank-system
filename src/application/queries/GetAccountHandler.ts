import { Pool } from 'pg';
import { NotFoundError } from '../../domain/errors';

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
export class GetAccountQueryHandler {
  constructor(private readonly pool: Pool) {}

  async handle(accountId: string): Promise<AccountSummary> {
    const { rows } = await this.pool.query(
      `SELECT account_id, owner_name, balance, currency, status
         FROM account_summaries
        WHERE account_id = $1`,
      [accountId],
    );

    if (rows.length === 0) {
      throw new NotFoundError(`Account '${accountId}' not found.`);
    }

    const row = rows[0];
    return {
      accountId: row.account_id as string,
      ownerName: row.owner_name as string,
      balance:   Number(row.balance),
      currency:  row.currency as string,
      status:    row.status as string,
    };
  }
}
