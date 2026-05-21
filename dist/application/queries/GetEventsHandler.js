"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEventsQueryHandler = void 0;
const errors_1 = require("../../domain/errors");
/**
 * GetEventsQueryHandler
 *
 * Returns the full, ordered event stream for an account straight from the
 * event store. This is an audit / introspection endpoint — one of the few
 * query endpoints that is allowed to read from the event store directly.
 */
class GetEventsQueryHandler {
    constructor(eventStore) {
        this.eventStore = eventStore;
    }
    async handle(accountId) {
        const exists = await this.eventStore.aggregateExists(accountId);
        if (!exists) {
            throw new errors_1.NotFoundError(`Account '${accountId}' not found.`);
        }
        const events = await this.eventStore.getEvents(accountId);
        return events.map(e => ({
            eventId: e.eventId,
            eventType: e.eventType,
            eventNumber: e.eventNumber,
            data: e.eventData,
            timestamp: e.timestamp.toISOString(),
        }));
    }
}
exports.GetEventsQueryHandler = GetEventsQueryHandler;
//# sourceMappingURL=GetEventsHandler.js.map