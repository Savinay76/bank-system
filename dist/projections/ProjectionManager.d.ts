import { Pool } from 'pg';
import { DomainEvent } from '../domain/events/types';
import { EventStore } from '../infrastructure/EventStore';
export interface ProjectionStatus {
    name: string;
    lastProcessedEventNumberGlobal: number;
    lag: number;
}
/**
 * ProjectionManager
 *
 * Orchestrates all individual projectors.
 * Responsibilities:
 *  1. Apply a list of events through every registered projector.
 *  2. Update the `projection_tracking` table after processing.
 *  3. Expose projection status (lag, last processed sequence).
 *  4. Drive a full projection rebuild (used by the admin endpoint).
 */
export declare class ProjectionManager {
    private readonly pool;
    private readonly eventStore;
    private readonly summaryProjector;
    private readonly txProjector;
    constructor(pool: Pool, eventStore: EventStore);
    /**
     * Process a batch of new events produced by a command handler.
     * Called synchronously right after events are persisted.
     */
    applyEvents(events: DomainEvent[]): Promise<void>;
    /**
     * Rebuild all projections from scratch by replaying the entire event store.
     * Runs in a single transaction for atomicity.
     */
    rebuildAll(): Promise<void>;
    /** Return the current status of all projections vs the event store. */
    getStatus(): Promise<{
        totalEventsInStore: number;
        projections: ProjectionStatus[];
    }>;
}
