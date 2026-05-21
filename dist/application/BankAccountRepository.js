"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccountRepository = void 0;
const BankAccount_1 = require("../domain/aggregates/BankAccount");
const errors_1 = require("../domain/errors");
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
class BankAccountRepository {
    constructor(eventStore, snapshotStore, projectionManager) {
        this.eventStore = eventStore;
        this.snapshotStore = snapshotStore;
        this.projectionManager = projectionManager;
    }
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
    async load(accountId) {
        const snapshot = await this.snapshotStore.getSnapshot(accountId);
        if (snapshot) {
            const events = await this.eventStore.getEvents(accountId, snapshot.lastEventNumber);
            return BankAccount_1.BankAccount.fromSnapshot(snapshot.snapshotData, events);
        }
        const events = await this.eventStore.getEvents(accountId);
        return BankAccount_1.BankAccount.fromEvents(events);
    }
    /**
     * Like load(), but throws NotFoundError when the aggregate does not exist.
     * Use this variant from command / query handlers that require the account.
     */
    async loadOrThrow(accountId) {
        const account = await this.load(accountId);
        if (!account.exists) {
            throw new errors_1.NotFoundError(`Account '${accountId}' not found.`);
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
    async save(account) {
        const uncommitted = account.getUncommittedEvents();
        if (uncommitted.length === 0)
            return [];
        const expectedVersion = account.persistedVersion;
        // 1. Persist events (with optimistic concurrency check)
        const persisted = await this.eventStore.appendEvents(account.id, uncommitted, expectedVersion);
        // 2. Clear uncommitted buffer (aggregate is now consistent with store)
        account.clearUncommittedEvents();
        // 3. Update read-model projections synchronously
        await this.projectionManager.applyEvents(persisted);
        // 4. Snapshotting: take a snapshot when event_number hits a threshold multiple
        const triggerEvent = persisted.find(e => e.eventNumber % SNAPSHOT_THRESHOLD === 0);
        if (triggerEvent) {
            await this.snapshotStore.saveSnapshot(account.id, account.toSnapshotData(), triggerEvent.eventNumber);
        }
        return persisted;
    }
}
exports.BankAccountRepository = BankAccountRepository;
//# sourceMappingURL=BankAccountRepository.js.map