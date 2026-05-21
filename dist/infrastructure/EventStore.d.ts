import { Pool } from 'pg';
import { DomainEvent, UncommittedEvent } from '../domain/events/types';
export declare class EventStore {
    private readonly pool;
    constructor(pool: Pool);
    /**
     * Append uncommitted events to the store.
     *
     * Uses SELECT … FOR UPDATE to obtain a row-level lock on the aggregate's
     * latest event before inserting, preventing concurrent writes from
     * producing conflicting event_numbers (optimistic concurrency).
     *
     * @param aggregateId     Target aggregate
     * @param events          Events produced by the command handler
     * @param expectedVersion The event_number of the last known persisted event
     */
    appendEvents(aggregateId: string, events: ReadonlyArray<UncommittedEvent>, expectedVersion: number): Promise<DomainEvent[]>;
    /**
     * Retrieve events for a single aggregate, optionally starting after a given
     * event_number (used when loading from a snapshot).
     */
    getEvents(aggregateId: string, afterEventNumber?: number): Promise<DomainEvent[]>;
    /**
     * Retrieve ALL events in global insertion order.
     * Used by the projection rebuilder.
     */
    getAllEvents(afterGlobalSequence?: number): Promise<DomainEvent[]>;
    /**
     * Retrieve events for an aggregate up to (and including) a given timestamp.
     * Used for time-travel queries.
     */
    getEventsUpToTimestamp(aggregateId: string, timestamp: Date): Promise<DomainEvent[]>;
    /** Total number of events in the store. */
    getTotalCount(): Promise<number>;
    /** Max global_sequence currently in the store. */
    getMaxGlobalSequence(): Promise<number>;
    /** Check whether at least one event exists for the aggregate. */
    aggregateExists(aggregateId: string): Promise<boolean>;
}
