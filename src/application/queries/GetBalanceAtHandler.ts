import { EventStore } from '../../infrastructure/EventStore';
import { BankAccount } from '../../domain/aggregates/BankAccount';
import { NotFoundError, ValidationError } from '../../domain/errors';

export interface BalanceAtResult {
  accountId: string;
  balanceAt: number;
  timestamp: string;
}

/**
 * GetBalanceAtQueryHandler  (Time-travel query)
 *
 * Reconstructs the account balance at a specific point in time by replaying
 * all events up to (and including) that timestamp.
 *
 * This endpoint reads directly from the event store — explicitly allowed for
 * audit / time-travel use-cases per the CQRS spec.
 */
export class GetBalanceAtQueryHandler {
  constructor(private readonly eventStore: EventStore) {}

  async handle(accountId: string, timestampStr: string): Promise<BalanceAtResult> {
    // Parse and validate the timestamp
    const ts = new Date(decodeURIComponent(timestampStr));
    if (isNaN(ts.getTime())) {
      throw new ValidationError(
        `Invalid timestamp '${timestampStr}'. Must be an ISO 8601 string.`,
      );
    }

    // Check that the account exists at all
    const exists = await this.eventStore.aggregateExists(accountId);
    if (!exists) {
      throw new NotFoundError(`Account '${accountId}' not found.`);
    }

    // Fetch only the events that occurred up to the requested timestamp
    const events = await this.eventStore.getEventsUpToTimestamp(accountId, ts);

    // Replay to get the balance at that moment in time
    const account = BankAccount.fromEvents(events);

    return {
      accountId,
      balanceAt: account.toSnapshotData().balance,
      timestamp: ts.toISOString(),
    };
  }
}
