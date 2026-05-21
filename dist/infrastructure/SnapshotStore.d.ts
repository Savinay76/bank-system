import { Pool } from 'pg';
import { BankAccountState } from '../domain/aggregates/BankAccount';
export interface SnapshotRecord {
    snapshotId: string;
    aggregateId: string;
    snapshotData: BankAccountState;
    lastEventNumber: number;
    createdAt: Date;
}
export declare class SnapshotStore {
    private readonly pool;
    constructor(pool: Pool);
    /**
     * Upsert a snapshot for the given aggregate.
     * (The snapshots table has UNIQUE on aggregate_id, so ON CONFLICT replaces.)
     */
    saveSnapshot(aggregateId: string, data: BankAccountState, lastEventNumber: number): Promise<void>;
    /** Load the latest snapshot for an aggregate, or null if none exists. */
    getSnapshot(aggregateId: string): Promise<SnapshotRecord | null>;
}
