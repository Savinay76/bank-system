import { BankAccount } from '../domain/aggregates/BankAccount';
import { DomainEvent } from '../domain/events/types';
import { EventStore } from '../infrastructure/EventStore';
import { SnapshotStore } from '../infrastructure/SnapshotStore';
import { ProjectionManager } from '../projections/ProjectionManager';
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
export declare class BankAccountRepository {
    private readonly eventStore;
    private readonly snapshotStore;
    private readonly projectionManager;
    constructor(eventStore: EventStore, snapshotStore: SnapshotStore, projectionManager: ProjectionManager);
    /**
     * Load a BankAccount aggregate for reading or as the target of a command.
     *
     * Algorithm:
     *  1. Try to fetch the latest snapshot.
     *  2. Load all events that occurred AFTER the snapshot's last_event_number
     *     (or all events when there is no snapshot).
     *  3. Reconstruct the aggregate in-memory.
     */
    load(accountId: string): Promise<BankAccount>;
    /**
     * Like load(), but throws NotFoundError when the aggregate does not exist.
     * Use this variant from command / query handlers that require the account.
     */
    loadOrThrow(accountId: string): Promise<BankAccount>;
    /**
     * Persist uncommitted events, update projections, and maybe take a snapshot.
     *
     * Returns the list of persisted DomainEvent objects (including DB-generated
     * fields like event_id and global_sequence).
     */
    save(account: BankAccount): Promise<DomainEvent[]>;
}
