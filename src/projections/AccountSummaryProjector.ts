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
export class AccountSummaryProjector {
  constructor(private readonly pool: Pool) {}

  async project(event: DomainEvent, client?: PoolClient): Promise<void> {
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

  private async onAccountCreated(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    const d = event.eventData as {
      accountId: string;
      ownerName: string;
      initialBalance: number;
      currency: string;
    };
    await db.query(
      `INSERT INTO account_summaries
         (account_id, owner_name, balance, currency, status, version)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)
       ON CONFLICT (account_id) DO NOTHING`,
      [d.accountId, d.ownerName, d.initialBalance, d.currency, event.eventNumber],
    );
  }

  private async onMoneyDeposited(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    const d = event.eventData as { amount: number };
    await db.query(
      `UPDATE account_summaries
          SET balance = balance + $1,
              version = $2
        WHERE account_id = $3
          AND version < $2`,   // idempotency guard
      [d.amount, event.eventNumber, event.aggregateId],
    );
  }

  private async onMoneyWithdrawn(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    const d = event.eventData as { amount: number };
    await db.query(
      `UPDATE account_summaries
          SET balance = balance - $1,
              version = $2
        WHERE account_id = $3
          AND version < $2`,
      [d.amount, event.eventNumber, event.aggregateId],
    );
  }

  private async onAccountClosed(
    event: DomainEvent,
    db: Pool | PoolClient,
  ): Promise<void> {
    await db.query(
      `UPDATE account_summaries
          SET status  = 'CLOSED',
              version = $1
        WHERE account_id = $2
          AND version < $1`,
      [event.eventNumber, event.aggregateId],
    );
  }

  /** Wipe the read model (used during projection rebuild). */
  async truncate(db: Pool | PoolClient = this.pool): Promise<void> {
    await db.query('TRUNCATE account_summaries');
  }
}
