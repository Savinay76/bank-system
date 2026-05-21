import { EventStore } from '../../infrastructure/EventStore';
import { NotFoundError } from '../../domain/errors';

export interface EventView {
  eventId: string;
  eventType: string;
  eventNumber: number;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * GetEventsQueryHandler
 *
 * Returns the full, ordered event stream for an account straight from the
 * event store. This is an audit / introspection endpoint — one of the few
 * query endpoints that is allowed to read from the event store directly.
 */
export class GetEventsQueryHandler {
  constructor(private readonly eventStore: EventStore) {}

  async handle(accountId: string): Promise<EventView[]> {
    const exists = await this.eventStore.aggregateExists(accountId);
    if (!exists) {
      throw new NotFoundError(`Account '${accountId}' not found.`);
    }

    const events = await this.eventStore.getEvents(accountId);

    return events.map(e => ({
      eventId:     e.eventId,
      eventType:   e.eventType,
      eventNumber: e.eventNumber,
      data:        e.eventData as Record<string, unknown>,
      timestamp:   e.timestamp.toISOString(),
    }));
  }
}
