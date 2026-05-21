"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionManager = void 0;
const AccountSummaryProjector_1 = require("./AccountSummaryProjector");
const TransactionHistoryProjector_1 = require("./TransactionHistoryProjector");
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
class ProjectionManager {
    constructor(pool, eventStore) {
        this.pool = pool;
        this.eventStore = eventStore;
        this.summaryProjector = new AccountSummaryProjector_1.AccountSummaryProjector(pool);
        this.txProjector = new TransactionHistoryProjector_1.TransactionHistoryProjector(pool);
    }
    /**
     * Process a batch of new events produced by a command handler.
     * Called synchronously right after events are persisted.
     */
    async applyEvents(events) {
        if (events.length === 0)
            return;
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const event of events) {
                await this.summaryProjector.project(event, client);
                await this.txProjector.project(event, client);
            }
            const maxGlobal = Math.max(...events.map(e => e.globalSequence));
            // Update tracking for both projections (using the highest global seq)
            await client.query(`UPDATE projection_tracking
            SET last_processed_global_sequence = GREATEST(last_processed_global_sequence, $1),
                updated_at = NOW()
          WHERE projection_name IN ('AccountSummaries', 'TransactionHistory')`, [maxGlobal]);
            await client.query('COMMIT');
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Rebuild all projections from scratch by replaying the entire event store.
     * Runs in a single transaction for atomicity.
     */
    async rebuildAll() {
        const allEvents = await this.eventStore.getAllEvents(0);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Wipe existing read models
            await this.summaryProjector.truncate(client);
            await this.txProjector.truncate(client);
            // Reset tracking
            await client.query(`UPDATE projection_tracking
            SET last_processed_global_sequence = 0,
                updated_at = NOW()`);
            // Replay every event
            for (const event of allEvents) {
                await this.summaryProjector.project(event, client);
                await this.txProjector.project(event, client);
            }
            // Advance tracking to the latest global sequence
            if (allEvents.length > 0) {
                const maxGlobal = Math.max(...allEvents.map(e => e.globalSequence));
                await client.query(`UPDATE projection_tracking
              SET last_processed_global_sequence = $1,
                  updated_at = NOW()`, [maxGlobal]);
            }
            await client.query('COMMIT');
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /** Return the current status of all projections vs the event store. */
    async getStatus() {
        const [totalEvents, maxGlobal, trackingRows] = await Promise.all([
            this.eventStore.getTotalCount(),
            this.eventStore.getMaxGlobalSequence(),
            this.pool.query('SELECT * FROM projection_tracking ORDER BY projection_name'),
        ]);
        const projections = trackingRows.rows.map(row => ({
            name: row.projection_name === 'AccountSummaries'
                ? 'AccountSummaries'
                : 'TransactionHistory',
            lastProcessedEventNumberGlobal: Number(row.last_processed_global_sequence),
            lag: maxGlobal - Number(row.last_processed_global_sequence),
        }));
        return { totalEventsInStore: totalEvents, projections };
    }
}
exports.ProjectionManager = ProjectionManager;
//# sourceMappingURL=ProjectionManager.js.map