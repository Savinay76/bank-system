import { EventStore } from '../../infrastructure/EventStore';
export interface BalanceAtResult {
    accountId: string;
    balanceAt: number;
    timestamp: string;
}
/**
 * GetBalanceAtQueryHandler  (Time-travel query)
 *
 * Reconstructs the account balance at a specific point in time by replaying
 * all events up to (and including) that timestamp.
 *
 * This endpoint reads directly from the event store — explicitly allowed for
 * audit / time-travel use-cases per the CQRS spec.
 */
export declare class GetBalanceAtQueryHandler {
    private readonly eventStore;
    constructor(eventStore: EventStore);
    handle(accountId: string, timestampStr: string): Promise<BalanceAtResult>;
}
