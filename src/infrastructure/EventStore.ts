import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, UncommittedEvent } from '../domain/events/types';
import { ConcurrencyError } from '../domain/errors';

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------
function rowToEvent(row: Record<string, unknown>): DomainEvent {
  return {
    eventId:        row.event_id as string,
    aggregateId:    row.aggregate_id as string,
    aggregateType:  row.aggregate_type as string,
    eventType:      row.event_type as DomainEvent['eventType'],
    eventData:      row.event_data as DomainEvent['eventData'],
    eventNumber:    Number(row.event_number),
    globalSequence: Number(row.global_sequence),
    timestamp:      new Date(row.timestamp as string),
    version:        Number(row.version),
  };
}

// ---------------------------------------------------------------------------
// EventStore
// ---------------------------------------------------------------------------
export class EventStore {
  constructor(private readonly pool: Pool) {}

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
  async appendEvents(
    aggregateId: string,
    events: ReadonlyArray<UncommittedEvent>,
    expectedVersion: number,
  ): Promise<DomainEvent[]> {
    if (events.length === 0) return [];

    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Acquire lock and verify current version (optimistic concurrency)
      const { rows } = await client.query<{ current_version: string }>(
        `SELECT event_number::TEXT AS current_version
           FROM events
          WHERE aggregate_id = $1
          ORDER BY event_number DESC
          LIMIT 1
          FOR UPDATE`,
        [aggregateId],
      );

      const currentVersion = rows.length > 0 ? Number(rows[0].current_version) : 0;
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        throw new ConcurrencyError(
          `Concurrency conflict for aggregate '${aggregateId}': ` +
          `expected version ${expectedVersion}, actual version ${currentVersion}.`,
        );
      }

      const saved: DomainEvent[] = [];

      for (const evt of events) {
        const eventId = uuidv4();
        const { rows: inserted } = await client.query(
          `INSERT INTO events
             (event_id, aggregate_id, aggregate_type, event_type,
              event_data, event_number, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            eventId,
            evt.aggregateId,
            evt.aggregateType,
            evt.eventType,
            JSON.stringify(evt.eventData),
            evt.eventNumber,
            evt.version,
          ],
        );
        saved.push(rowToEvent(inserted[0] as Record<string, unknown>));
      }

      await client.query('COMMIT');
      return saved;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve events for a single aggregate, optionally starting after a given
   * event_number (used when loading from a snapshot).
   */
  async getEvents(
    aggregateId: string,
    afterEventNumber = 0,
  ): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM events
        WHERE aggregate_id = $1
          AND event_number > $2
        ORDER BY event_number ASC`,
      [aggregateId, afterEventNumber],
    );
    return rows.map(r => rowToEvent(r as Record<string, unknown>));
  }

  /**
   * Retrieve ALL events in global insertion order.
   * Used by the projection rebuilder.
   */
  async getAllEvents(afterGlobalSequence = 0): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM events
        WHERE global_sequence > $1
        ORDER BY global_sequence ASC`,
      [afterGlobalSequence],
    );
    return rows.map(r => rowToEvent(r as Record<string, unknown>));
  }

  /**
   * Retrieve events for an aggregate up to (and including) a given timestamp.
   * Used for time-travel queries.
   */
  async getEventsUpToTimestamp(
    aggregateId: string,
    timestamp: Date,
  ): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM events
        WHERE aggregate_id = $1
          AND timestamp <= $2
        ORDER BY event_number ASC`,
      [aggregateId, timestamp.toISOString()],
    );
    return rows.map(r => rowToEvent(r as Record<string, unknown>));
  }

  /** Total number of events in the store. */
  async getTotalCount(): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::TEXT AS cnt FROM events',
    );
    return Number(rows[0].cnt);
  }

  /** Max global_sequence currently in the store. */
  async getMaxGlobalSequence(): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COALESCE(MAX(global_sequence), 0)::TEXT AS mx FROM events',
    );
    return Number(rows[0].mx);
  }

  /** Check whether at least one event exists for the aggregate. */
  async aggregateExists(aggregateId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM events WHERE aggregate_id = $1 LIMIT 1',
      [aggregateId],
    );
    return rows.length > 0;
  }
}
