"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccount = void 0;
const errors_1 = require("../errors");
// ---------------------------------------------------------------------------
// BankAccount – the aggregate root
// ---------------------------------------------------------------------------
class BankAccount {
    constructor() {
        // ---- mutable in-memory state ----
        this._accountId = '';
        this._ownerName = '';
        this._balance = 0;
        this._currency = 'USD';
        this._status = 'OPEN';
        /** The event_number of the last event that was PERSISTED and applied */
        this._persistedVersion = 0;
        /** Set used for O(1) idempotency checks */
        this._processedTransactionIds = new Set();
        /** Events produced by this command invocation, not yet persisted */
        this._uncommittedEvents = [];
    }
    // ── helpers ────────────────────────────────────────────────────────────────
    /** Next event_number to be assigned to an uncommitted event */
    get nextEventNumber() {
        return this._persistedVersion + this._uncommittedEvents.length + 1;
    }
    // ── static factory methods ─────────────────────────────────────────────────
    /**
     * Rebuild the aggregate by replaying the full event history from the store.
     * Used when no snapshot is available.
     */
    static fromEvents(events) {
        const acc = new BankAccount();
        for (const e of events) {
            acc.applyPersistedEvent(e);
        }
        return acc;
    }
    /**
     * Restore the aggregate from a snapshot and then apply any subsequent
     * events (those with event_number > snapshot.last_event_number).
     */
    static fromSnapshot(snapshotData, subsequentEvents) {
        const acc = new BankAccount();
        acc._accountId = snapshotData.accountId;
        acc._ownerName = snapshotData.ownerName;
        acc._balance = snapshotData.balance;
        acc._currency = snapshotData.currency;
        acc._status = snapshotData.status;
        acc._persistedVersion = snapshotData.persistedVersion;
        acc._processedTransactionIds = new Set(snapshotData.processedTransactionIds);
        for (const e of subsequentEvents) {
            acc.applyPersistedEvent(e);
        }
        return acc;
    }
    // ── event application ──────────────────────────────────────────────────────
    /**
     * Apply a persisted event and advance persistedVersion.
     * Called both during replay and after committing.
     */
    applyPersistedEvent(event) {
        this.applyData(event.eventType, event.eventData);
        this._persistedVersion = event.eventNumber;
    }
    /**
     * Apply raw event data to mutate in-memory state.
     * This is the single place state transitions are defined.
     */
    applyData(eventType, data) {
        switch (eventType) {
            case 'AccountCreated': {
                const d = data;
                this._accountId = d.accountId;
                this._ownerName = d.ownerName;
                this._balance = Number(d.initialBalance);
                this._currency = d.currency;
                this._status = 'OPEN';
                break;
            }
            case 'MoneyDeposited': {
                const d = data;
                this._balance = round4(this._balance + Number(d.amount));
                if (d.transactionId)
                    this._processedTransactionIds.add(d.transactionId);
                break;
            }
            case 'MoneyWithdrawn': {
                const d = data;
                this._balance = round4(this._balance - Number(d.amount));
                if (d.transactionId)
                    this._processedTransactionIds.add(d.transactionId);
                break;
            }
            case 'AccountClosed': {
                this._status = 'CLOSED';
                break;
            }
        }
    }
    // ── command handlers ───────────────────────────────────────────────────────
    /**
     * CREATE ACCOUNT command
     * Preconditions: aggregate must not already exist.
     */
    createAccount(cmd) {
        if (this._accountId) {
            throw new errors_1.ConflictError(`Account '${cmd.accountId}' already exists.`);
        }
        if (cmd.initialBalance < 0) {
            throw new errors_1.ValidationError('initialBalance must be >= 0.');
        }
        if (!cmd.ownerName || cmd.ownerName.trim() === '') {
            throw new errors_1.ValidationError('ownerName is required.');
        }
        const payload = {
            accountId: cmd.accountId,
            ownerName: cmd.ownerName.trim(),
            initialBalance: cmd.initialBalance,
            currency: (cmd.currency || 'USD').toUpperCase(),
        };
        this.record('AccountCreated', payload, cmd.accountId);
        // Apply immediately so subsequent commands in same unit of work see the update
        this.applyData('AccountCreated', payload);
    }
    /**
     * DEPOSIT MONEY command
     * Idempotent: duplicate transactionId is silently ignored.
     */
    deposit(cmd) {
        this.assertOpen();
        if (cmd.amount <= 0) {
            throw new errors_1.ValidationError('Deposit amount must be greater than 0.');
        }
        if (this._processedTransactionIds.has(cmd.transactionId)) {
            return; // idempotent – already processed
        }
        const payload = {
            transactionId: cmd.transactionId,
            amount: cmd.amount,
            description: cmd.description,
        };
        this.record('MoneyDeposited', payload);
        this.applyData('MoneyDeposited', payload);
    }
    /**
     * WITHDRAW MONEY command
     * Fails with ConflictError when balance is insufficient.
     * Idempotent: duplicate transactionId is silently ignored.
     */
    withdraw(cmd) {
        this.assertOpen();
        if (cmd.amount <= 0) {
            throw new errors_1.ValidationError('Withdrawal amount must be greater than 0.');
        }
        if (this._processedTransactionIds.has(cmd.transactionId)) {
            return; // idempotent
        }
        if (this._balance < cmd.amount) {
            throw new errors_1.ConflictError(`Insufficient funds. Balance: ${this._balance}, requested: ${cmd.amount}.`);
        }
        const payload = {
            transactionId: cmd.transactionId,
            amount: cmd.amount,
            description: cmd.description,
        };
        this.record('MoneyWithdrawn', payload);
        this.applyData('MoneyWithdrawn', payload);
    }
    /**
     * CLOSE ACCOUNT command
     * Fails with ConflictError when balance is non-zero.
     */
    closeAccount(cmd) {
        if (!this._accountId) {
            throw new errors_1.NotFoundError('Account not found.');
        }
        if (this._status === 'CLOSED') {
            throw new errors_1.ConflictError('Account is already closed.');
        }
        if (this._balance !== 0) {
            throw new errors_1.ConflictError(`Account balance must be 0 before closing. Current balance: ${this._balance}.`);
        }
        const payload = { reason: cmd.reason };
        this.record('AccountClosed', payload);
        this.applyData('AccountClosed', payload);
    }
    // ── record helper ──────────────────────────────────────────────────────────
    record(eventType, eventData, overrideAggregateId) {
        this._uncommittedEvents.push({
            aggregateId: overrideAggregateId ?? this._accountId,
            aggregateType: 'BankAccount',
            eventType: eventType,
            eventData,
            eventNumber: this.nextEventNumber,
            version: 1,
        });
    }
    // ── guard ──────────────────────────────────────────────────────────────────
    assertOpen() {
        if (!this._accountId)
            throw new errors_1.NotFoundError('Account not found.');
        if (this._status === 'CLOSED')
            throw new errors_1.ConflictError('Account is closed.');
    }
    // ── public accessors ───────────────────────────────────────────────────────
    get exists() { return !!this._accountId; }
    get id() { return this._accountId; }
    get persistedVersion() { return this._persistedVersion; }
    getUncommittedEvents() {
        return this._uncommittedEvents;
    }
    clearUncommittedEvents() {
        this._uncommittedEvents = [];
    }
    /** Returns a plain-object snapshot of the current in-memory state */
    toSnapshotData() {
        return {
            accountId: this._accountId,
            ownerName: this._ownerName,
            balance: this._balance,
            currency: this._currency,
            status: this._status,
            persistedVersion: this._persistedVersion,
            processedTransactionIds: Array.from(this._processedTransactionIds),
        };
    }
}
exports.BankAccount = BankAccount;
// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function round4(n) {
    return Math.round(n * 10000) / 10000;
}
//# sourceMappingURL=BankAccount.js.map