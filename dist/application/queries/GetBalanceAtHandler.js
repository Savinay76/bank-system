"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBalanceAtQueryHandler = void 0;
const BankAccount_1 = require("../../domain/aggregates/BankAccount");
const errors_1 = require("../../domain/errors");
/**
 * GetBalanceAtQueryHandler  (Time-travel query)
 *
 * Reconstructs the account balance at a specific point in time by replaying
 * all events up to (and including) that timestamp.
 *
 * This endpoint reads directly from the event store — explicitly allowed for
 * audit / time-travel use-cases per the CQRS spec.
 */
class GetBalanceAtQueryHandler {
    constructor(eventStore) {
        this.eventStore = eventStore;
    }
    async handle(accountId, timestampStr) {
        // Parse and validate the timestamp
        const ts = new Date(decodeURIComponent(timestampStr));
        if (isNaN(ts.getTime())) {
            throw new errors_1.ValidationError(`Invalid timestamp '${timestampStr}'. Must be an ISO 8601 string.`);
        }
        // Check that the account exists at all
        const exists = await this.eventStore.aggregateExists(accountId);
        if (!exists) {
            throw new errors_1.NotFoundError(`Account '${accountId}' not found.`);
        }
        // Fetch only the events that occurred up to the requested timestamp
        const events = await this.eventStore.getEventsUpToTimestamp(accountId, ts);
        // Replay to get the balance at that moment in time
        const account = BankAccount_1.BankAccount.fromEvents(events);
        return {
            accountId,
            balanceAt: account.toSnapshotData().balance,
            timestamp: ts.toISOString(),
        };
    }
}
exports.GetBalanceAtQueryHandler = GetBalanceAtQueryHandler;
//# sourceMappingURL=GetBalanceAtHandler.js.map