// =============================================================================
// Domain Event Types
// Every change to a BankAccount is represented as one of these immutable events.
// =============================================================================

/** A fully-persisted domain event (includes DB-generated fields). */
export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: EventType;
  eventData: EventPayload;
  eventNumber: number;       // per-aggregate monotonic counter
  globalSequence: number;    // cross-aggregate monotonic counter
  timestamp: Date;
  version: number;           // event-schema version (for upcasting)
}

/**
 * An event that has been produced by a command handler but not yet persisted.
 * DB-generated fields (eventId, globalSequence, timestamp) are absent.
 */
export interface UncommittedEvent {
  aggregateId: string;
  aggregateType: string;
  eventType: EventType;
  eventData: EventPayload;
  eventNumber: number;
  version: number;
}

// ---------------------------------------------------------------------------
// Event-type discriminated union
// ---------------------------------------------------------------------------
export type EventType =
  | 'AccountCreated'
  | 'MoneyDeposited'
  | 'MoneyWithdrawn'
  | 'AccountClosed';

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------
export interface AccountCreatedData {
  accountId: string;
  ownerName: string;
  initialBalance: number;
  currency: string;
}

export interface MoneyDepositedData {
  transactionId: string;
  amount: number;
  description?: string;
}

export interface MoneyWithdrawnData {
  transactionId: string;
  amount: number;
  description?: string;
}

export interface AccountClosedData {
  reason: string;
}

export type EventPayload =
  | AccountCreatedData
  | MoneyDepositedData
  | MoneyWithdrawnData
  | AccountClosedData
  | Record<string, unknown>;
