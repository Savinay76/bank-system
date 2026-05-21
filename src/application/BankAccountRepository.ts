import { BankAccount } from '../domain/aggregates/BankAccount';
import { DomainEvent } from '../domain/events/types';
import { NotFoundError } from '../domain/errors';
import { EventStore } from '../infrastructure/EventStore';
import { SnapshotStore } from '../infrastructure/SnapshotStore';
import { ProjectionManager } from '../projections/ProjectionManager';

const SNAPSHOT_THRESHOLD = Number(process.env.SNAPSHOT_THRESHOLD ?? 50);

/**
 * BankAccountRepository
 *
 * Implements the "load from snapshot + events → execute command → save events"
 * cycle that is the heart of an Event-Sourced aggregate.
 *
 * Snapshotting strategy
 * ─────────────────────
 * After any batch of events is persisted, this repository checks whether the
 * highest event_number in the batch is a multiple of SNAPSHOT_THRESHOLD (default 50).
 * If so it saves a snapshot of the aggregate's current in-memory state so that
 * future loads only need to replay events since that snapshot.
 */
export class BankAccountRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly projectionManager: ProjectionManager,
  ) {}

  // ── Load ─────────────────────────────────────────────────────────────────

  /**
   * Load a BankAccount aggregate for reading or as the target of a command.
   *
   * Algorithm:
   *  1. Try to fetch the latest snapshot.
   *  2. Load all events that occurred AFTER the snapshot's last_event_number
   *     (or all events when there is no snapshot).
   *  3. Reconstruct the aggregate in-memory.
   */
  async load(accountId: string): Promise<BankAccount> {
    const snapshot = await this.snapshotStore.getSnapshot(accountId);

    if (snapshot) {
      const events = await this.eventStore.getEvents(
        accountId,
        snapshot.lastEventNumber,
      );
      return BankAccount.fromSnapshot(snapshot.snapshotData, events);
    }

    const events = await this.eventStore.getEvents(accountId);
    return BankAccount.fromEvents(events);
  }

  /**
   * Like load(), but throws NotFoundError when the aggregate does not exist.
   * Use this variant from command / query handlers that require the account.
   */
  async loadOrThrow(accountId: string): Promise<BankAccount> {
    const account = await this.load(accountId);
    if (!account.exists) {
      throw new NotFoundError(`Account '${accountId}' not found.`);
    }
    return account;
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  /**
   * Persist uncommitted events, update projections, and maybe take a snapshot.
   *
   * Returns the list of persisted DomainEvent objects (including DB-generated
   * fields like event_id and global_sequence).
   */
  async save(account: BankAccount): Promise<DomainEvent[]> {
    const uncommitted = account.getUncommittedEvents();
    if (uncommitted.length === 0) return [];

    const expectedVersion = account.persistedVersion;

    // 1. Persist events (with optimistic concurrency check)
    const persisted = await this.eventStore.appendEvents(
      account.id,
      uncommitted,
      expectedVersion,
    );

    // 2. Clear uncommitted buffer (aggregate is now consistent with store)
    account.clearUncommittedEvents();

    // 3. Update read-model projections synchronously
    await this.projectionManager.applyEvents(persisted);

    // 4. Snapshotting: take a snapshot when event_number hits a threshold multiple
    const triggerEvent = persisted.find(
      e => e.eventNumber % SNAPSHOT_THRESHOLD === 0,
    );
    if (triggerEvent) {
      await this.snapshotStore.saveSnapshot(
        account.id,
        account.toSnapshotData(),
        triggerEvent.eventNumber,
      );
    }

    return persisted;
  }
}
