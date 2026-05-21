"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotStore = void 0;
const uuid_1 = require("uuid");
class SnapshotStore {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Upsert a snapshot for the given aggregate.
     * (The snapshots table has UNIQUE on aggregate_id, so ON CONFLICT replaces.)
     */
    async saveSnapshot(aggregateId, data, lastEventNumber) {
        const snapshotId = (0, uuid_1.v4)();
        await this.pool.query(`INSERT INTO snapshots
         (snapshot_id, aggregate_id, snapshot_data, last_event_number)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aggregate_id)
       DO UPDATE SET
         snapshot_data     = EXCLUDED.snapshot_data,
         last_event_number = EXCLUDED.last_event_number,
         created_at        = NOW()`, [snapshotId, aggregateId, JSON.stringify(data), lastEventNumber]);
    }
    /** Load the latest snapshot for an aggregate, or null if none exists. */
    async getSnapshot(aggregateId) {
        const { rows } = await this.pool.query(`SELECT * FROM snapshots WHERE aggregate_id = $1`, [aggregateId]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            snapshotId: row.snapshot_id,
            aggregateId: row.aggregate_id,
            snapshotData: row.snapshot_data,
            lastEventNumber: Number(row.last_event_number),
            createdAt: new Date(row.created_at),
        };
    }
}
exports.SnapshotStore = SnapshotStore;
//# sourceMappingURL=SnapshotStore.js.map