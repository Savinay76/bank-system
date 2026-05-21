import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { BankAccountState } from '../domain/aggregates/BankAccount';

export interface SnapshotRecord {
  snapshotId: string;
  aggregateId: string;
  snapshotData: BankAccountState;
  lastEventNumber: number;
  createdAt: Date;
}

export class SnapshotStore {
  constructor(private readonly pool: Pool) {}

  /**
   * Upsert a snapshot for the given aggregate.
   * (The snapshots table has UNIQUE on aggregate_id, so ON CONFLICT replaces.)
   */
  async saveSnapshot(
    aggregateId: string,
    data: BankAccountState,
    lastEventNumber: number,
  ): Promise<void> {
    const snapshotId = uuidv4();
    await this.pool.query(
      `INSERT INTO snapshots
         (snapshot_id, aggregate_id, snapshot_data, last_event_number)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aggregate_id)
       DO UPDATE SET
         snapshot_data     = EXCLUDED.snapshot_data,
         last_event_number = EXCLUDED.last_event_number,
         created_at        = NOW()`,
      [snapshotId, aggregateId, JSON.stringify(data), lastEventNumber],
    );
  }

  /** Load the latest snapshot for an aggregate, or null if none exists. */
  async getSnapshot(aggregateId: string): Promise<SnapshotRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM snapshots WHERE aggregate_id = $1`,
      [aggregateId],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      snapshotId:      row.snapshot_id as string,
      aggregateId:     row.aggregate_id as string,
      snapshotData:    row.snapshot_data as BankAccountState,
      lastEventNumber: Number(row.last_event_number),
      createdAt:       new Date(row.created_at as string),
    };
  }
}
