import { EventStore } from '../../infrastructure/EventStore';
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
export declare class GetEventsQueryHandler {
    private readonly eventStore;
    constructor(eventStore: EventStore);
    handle(accountId: string): Promise<EventView[]>;
}
