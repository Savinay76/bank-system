import { DomainEvent, UncommittedEvent } from '../events/types';
export interface BankAccountState {
    accountId: string;
    ownerName: string;
    balance: number;
    currency: string;
    status: 'OPEN' | 'CLOSED';
    persistedVersion: number;
    processedTransactionIds: string[];
}
export declare class BankAccount {
    private _accountId;
    private _ownerName;
    private _balance;
    private _currency;
    private _status;
    /** The event_number of the last event that was PERSISTED and applied */
    private _persistedVersion;
    /** Set used for O(1) idempotency checks */
    private _processedTransactionIds;
    /** Events produced by this command invocation, not yet persisted */
    private _uncommittedEvents;
    /** Next event_number to be assigned to an uncommitted event */
    private get nextEventNumber();
    /**
     * Rebuild the aggregate by replaying the full event history from the store.
     * Used when no snapshot is available.
     */
    static fromEvents(events: DomainEvent[]): BankAccount;
    /**
     * Restore the aggregate from a snapshot and then apply any subsequent
     * events (those with event_number > snapshot.last_event_number).
     */
    static fromSnapshot(snapshotData: BankAccountState, subsequentEvents: DomainEvent[]): BankAccount;
    /**
     * Apply a persisted event and advance persistedVersion.
     * Called both during replay and after committing.
     */
    private applyPersistedEvent;
    /**
     * Apply raw event data to mutate in-memory state.
     * This is the single place state transitions are defined.
     */
    private applyData;
    /**
     * CREATE ACCOUNT command
     * Preconditions: aggregate must not already exist.
     */
    createAccount(cmd: {
        accountId: string;
        ownerName: string;
        initialBalance: number;
        currency: string;
    }): void;
    /**
     * DEPOSIT MONEY command
     * Idempotent: duplicate transactionId is silently ignored.
     */
    deposit(cmd: {
        amount: number;
        description?: string;
        transactionId: string;
    }): void;
    /**
     * WITHDRAW MONEY command
     * Fails with ConflictError when balance is insufficient.
     * Idempotent: duplicate transactionId is silently ignored.
     */
    withdraw(cmd: {
        amount: number;
        description?: string;
        transactionId: string;
    }): void;
    /**
     * CLOSE ACCOUNT command
     * Fails with ConflictError when balance is non-zero.
     */
    closeAccount(cmd: {
        reason: string;
    }): void;
    private record;
    private assertOpen;
    get exists(): boolean;
    get id(): string;
    get persistedVersion(): number;
    getUncommittedEvents(): ReadonlyArray<UncommittedEvent>;
    clearUncommittedEvents(): void;
    /** Returns a plain-object snapshot of the current in-memory state */
    toSnapshotData(): BankAccountState;
}
