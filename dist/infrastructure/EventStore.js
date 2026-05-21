"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStore = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../domain/errors");
// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------
function rowToEvent(row) {
    return {
        eventId: row.event_id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        eventData: row.event_data,
        eventNumber: Number(row.event_number),
        globalSequence: Number(row.global_sequence),
        timestamp: new Date(row.timestamp),
        version: Number(row.version),
    };
}
// ---------------------------------------------------------------------------
// EventStore
// ---------------------------------------------------------------------------
class EventStore {
    constructor(pool) {
        this.pool = pool;
    }
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
    async appendEvents(aggregateId, events, expectedVersion) {
        if (events.length === 0)
            return [];
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Acquire lock and verify current version (optimistic concurrency)
            const { rows } = await client.query(`SELECT COALESCE(MAX(event_number), 0)::TEXT AS current_version
           FROM events
          WHERE aggregate_id = $1
            FOR UPDATE`, [aggregateId]);
            const currentVersion = Number(rows[0].current_version);
            if (currentVersion !== expectedVersion) {
                await client.query('ROLLBACK');
                throw new errors_1.ConcurrencyError(`Concurrency conflict for aggregate '${aggregateId}': ` +
                    `expected version ${expectedVersion}, actual version ${currentVersion}.`);
            }
            const saved = [];
            for (const evt of events) {
                const eventId = (0, uuid_1.v4)();
                const { rows: inserted } = await client.query(`INSERT INTO events
             (event_id, aggregate_id, aggregate_type, event_type,
              event_data, event_number, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`, [
                    eventId,
                    evt.aggregateId,
                    evt.aggregateType,
                    evt.eventType,
                    JSON.stringify(evt.eventData),
                    evt.eventNumber,
                    evt.version,
                ]);
                saved.push(rowToEvent(inserted[0]));
            }
            await client.query('COMMIT');
            return saved;
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
     * Retrieve events for a single aggregate, optionally starting after a given
     * event_number (used when loading from a snapshot).
     */
    async getEvents(aggregateId, afterEventNumber = 0) {
        const { rows } = await this.pool.query(`SELECT * FROM events
        WHERE aggregate_id = $1
          AND event_number > $2
        ORDER BY event_number ASC`, [aggregateId, afterEventNumber]);
        return rows.map(r => rowToEvent(r));
    }
    /**
     * Retrieve ALL events in global insertion order.
     * Used by the projection rebuilder.
     */
    async getAllEvents(afterGlobalSequence = 0) {
        const { rows } = await this.pool.query(`SELECT * FROM events
        WHERE global_sequence > $1
        ORDER BY global_sequence ASC`, [afterGlobalSequence]);
        return rows.map(r => rowToEvent(r));
    }
    /**
     * Retrieve events for an aggregate up to (and including) a given timestamp.
     * Used for time-travel queries.
     */
    async getEventsUpToTimestamp(aggregateId, timestamp) {
        const { rows } = await this.pool.query(`SELECT * FROM events
        WHERE aggregate_id = $1
          AND timestamp <= $2
        ORDER BY event_number ASC`, [aggregateId, timestamp.toISOString()]);
        return rows.map(r => rowToEvent(r));
    }
    /** Total number of events in the store. */
    async getTotalCount() {
        const { rows } = await this.pool.query('SELECT COUNT(*)::TEXT AS cnt FROM events');
        return Number(rows[0].cnt);
    }
    /** Max global_sequence currently in the store. */
    async getMaxGlobalSequence() {
        const { rows } = await this.pool.query('SELECT COALESCE(MAX(global_sequence), 0)::TEXT AS mx FROM events');
        return Number(rows[0].mx);
    }
    /** Check whether at least one event exists for the aggregate. */
    async aggregateExists(aggregateId) {
        const { rows } = await this.pool.query('SELECT 1 FROM events WHERE aggregate_id = $1 LIMIT 1', [aggregateId]);
        return rows.length > 0;
    }
}
exports.EventStore = EventStore;
//# sourceMappingURL=EventStore.js.map