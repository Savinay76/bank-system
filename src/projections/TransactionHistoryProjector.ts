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
export class TransactionHistoryProjector {
  constructor(private readonly pool: Pool) {}

  async project(event: DomainEvent, client?: PoolClient): Promise<void> {
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

  private async onMoneyDeposited(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    const d = event.eventData as {
      transactionId: string;
      amount: number;
      description?: string;
    };
    await db.query(
      `INSERT INTO transaction_history
         (transaction_id, account_id, type, amount, description, timestamp)
       VALUES ($1, $2, 'DEPOSIT', $3, $4, $5)
       ON CONFLICT (transaction_id) DO NOTHING`,
      [
        d.transactionId,
        event.aggregateId,
        d.amount,
        d.description ?? null,
        event.timestamp.toISOString(),
      ],
    );
  }

  private async onMoneyWithdrawn(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    const d = event.eventData as {
      transactionId: string;
      amount: number;
      description?: string;
    };
    await db.query(
      `INSERT INTO transaction_history
         (transaction_id, account_id, type, amount, description, timestamp)
       VALUES ($1, $2, 'WITHDRAWAL', $3, $4, $5)
       ON CONFLICT (transaction_id) DO NOTHING`,
      [
        d.transactionId,
        event.aggregateId,
        d.amount,
        d.description ?? null,
        event.timestamp.toISOString(),
      ],
    );
  }

  /** Wipe the read model (used during projection rebuild). */
  async truncate(db: Pool | PoolClient = this.pool): Promise<void> {
    await db.query('TRUNCATE transaction_history');
  }
}
