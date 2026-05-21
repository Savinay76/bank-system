import {
  DomainEvent,
  UncommittedEvent,
  AccountCreatedData,
  MoneyDepositedData,
  MoneyWithdrawnData,
  AccountClosedData,
} from '../events/types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors';

// ---------------------------------------------------------------------------
// State shape – also used as snapshot payload
// ---------------------------------------------------------------------------
export interface BankAccountState {
  accountId: string;
  ownerName: string;
  balance: number;
  currency: string;
  status: 'OPEN' | 'CLOSED';
  persistedVersion: number;             // highest persisted event_number
  processedTransactionIds: string[];    // for idempotent deposit/withdraw
}

// ---------------------------------------------------------------------------
// BankAccount – the aggregate root
// ---------------------------------------------------------------------------
export class BankAccount {
  // ---- mutable in-memory state ----
  private _accountId: string = '';
  private _ownerName: string = '';
  private _balance: number = 0;
  private _currency: string = 'USD';
  private _status: 'OPEN' | 'CLOSED' = 'OPEN';
  /** The event_number of the last event that was PERSISTED and applied */
  private _persistedVersion: number = 0;
  /** Set used for O(1) idempotency checks */
  private _processedTransactionIds: Set<string> = new Set();

  /** Events produced by this command invocation, not yet persisted */
  private _uncommittedEvents: UncommittedEvent[] = [];

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Next event_number to be assigned to an uncommitted event */
  private get nextEventNumber(): number {
    return this._persistedVersion + this._uncommittedEvents.length + 1;
  }

  // ── static factory methods ─────────────────────────────────────────────────

  /**
   * Rebuild the aggregate by replaying the full event history from the store.
   * Used when no snapshot is available.
   */
  static fromEvents(events: DomainEvent[]): BankAccount {
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
  static fromSnapshot(
    snapshotData: BankAccountState,
    subsequentEvents: DomainEvent[],
  ): BankAccount {
    const acc = new BankAccount();
    acc._accountId         = snapshotData.accountId;
    acc._ownerName         = snapshotData.ownerName;
    acc._balance           = snapshotData.balance;
    acc._currency          = snapshotData.currency;
    acc._status            = snapshotData.status;
    acc._persistedVersion  = snapshotData.persistedVersion;
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
  private applyPersistedEvent(event: DomainEvent): void {
    this.applyData(event.eventType, event.eventData as Record<string, unknown>);
    this._persistedVersion = event.eventNumber;
  }

  /**
   * Apply raw event data to mutate in-memory state.
   * This is the single place state transitions are defined.
   */
  private applyData(eventType: string, data: Record<string, unknown>): void {
    switch (eventType) {
      case 'AccountCreated': {
        const d = data as unknown as AccountCreatedData;
        this._accountId = d.accountId;
        this._ownerName = d.ownerName;
        this._balance   = Number(d.initialBalance);
        this._currency  = d.currency;
        this._status    = 'OPEN';
        break;
      }
      case 'MoneyDeposited': {
        const d = data as unknown as MoneyDepositedData;
        this._balance = round4(this._balance + Number(d.amount));
        if (d.transactionId) this._processedTransactionIds.add(d.transactionId);
        break;
      }
      case 'MoneyWithdrawn': {
        const d = data as unknown as MoneyWithdrawnData;
        this._balance = round4(this._balance - Number(d.amount));
        if (d.transactionId) this._processedTransactionIds.add(d.transactionId);
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
  createAccount(cmd: {
    accountId: string;
    ownerName: string;
    initialBalance: number;
    currency: string;
  }): void {
    if (this._accountId) {
      throw new ConflictError(`Account '${cmd.accountId}' already exists.`);
    }
    if (cmd.initialBalance < 0) {
      throw new ValidationError('initialBalance must be >= 0.');
    }
    if (!cmd.ownerName || cmd.ownerName.trim() === '') {
      throw new ValidationError('ownerName is required.');
    }

    const payload: AccountCreatedData = {
      accountId:      cmd.accountId,
      ownerName:      cmd.ownerName.trim(),
      initialBalance: cmd.initialBalance,
      currency:       (cmd.currency || 'USD').toUpperCase(),
    };

    this.record('AccountCreated', payload as unknown as Record<string, unknown>, cmd.accountId);
    // Apply immediately so subsequent commands in same unit of work see the update
    this.applyData('AccountCreated', payload as unknown as Record<string, unknown>);
  }

  /**
   * DEPOSIT MONEY command
   * Idempotent: duplicate transactionId is silently ignored.
   */
  deposit(cmd: {
    amount: number;
    description?: string;
    transactionId: string;
  }): void {
    this.assertOpen();
    if (cmd.amount <= 0) {
      throw new ValidationError('Deposit amount must be greater than 0.');
    }
    if (this._processedTransactionIds.has(cmd.transactionId)) {
      return; // idempotent – already processed
    }

    const payload: MoneyDepositedData = {
      transactionId: cmd.transactionId,
      amount:        cmd.amount,
      description:   cmd.description,
    };

    this.record('MoneyDeposited', payload as unknown as Record<string, unknown>);
    this.applyData('MoneyDeposited', payload as unknown as Record<string, unknown>);
  }

  /**
   * WITHDRAW MONEY command
   * Fails with ConflictError when balance is insufficient.
   * Idempotent: duplicate transactionId is silently ignored.
   */
  withdraw(cmd: {
    amount: number;
    description?: string;
    transactionId: string;
  }): void {
    this.assertOpen();
    if (cmd.amount <= 0) {
      throw new ValidationError('Withdrawal amount must be greater than 0.');
    }
    if (this._processedTransactionIds.has(cmd.transactionId)) {
      return; // idempotent
    }
    if (this._balance < cmd.amount) {
      throw new ConflictError(
        `Insufficient funds. Balance: ${this._balance}, requested: ${cmd.amount}.`,
      );
    }

    const payload: MoneyWithdrawnData = {
      transactionId: cmd.transactionId,
      amount:        cmd.amount,
      description:   cmd.description,
    };

    this.record('MoneyWithdrawn', payload as unknown as Record<string, unknown>);
    this.applyData('MoneyWithdrawn', payload as unknown as Record<string, unknown>);
  }

  /**
   * CLOSE ACCOUNT command
   * Fails with ConflictError when balance is non-zero.
   */
  closeAccount(cmd: { reason: string }): void {
    if (!this._accountId) {
      throw new NotFoundError('Account not found.');
    }
    if (this._status === 'CLOSED') {
      throw new ConflictError('Account is already closed.');
    }
    if (this._balance !== 0) {
      throw new ConflictError(
        `Account balance must be 0 before closing. Current balance: ${this._balance}.`,
      );
    }

    const payload: AccountClosedData = { reason: cmd.reason };
    this.record('AccountClosed', payload as unknown as Record<string, unknown>);
    this.applyData('AccountClosed', payload as unknown as Record<string, unknown>);
  }

  // ── record helper ──────────────────────────────────────────────────────────

  private record(
    eventType: string,
    eventData: Record<string, unknown>,
    overrideAggregateId?: string,
  ): void {
    this._uncommittedEvents.push({
      aggregateId:   overrideAggregateId ?? this._accountId,
      aggregateType: 'BankAccount',
      eventType:     eventType as UncommittedEvent['eventType'],
      eventData,
      eventNumber:   this.nextEventNumber,
      version:       1,
    });
  }

  // ── guard ──────────────────────────────────────────────────────────────────

  private assertOpen(): void {
    if (!this._accountId) throw new NotFoundError('Account not found.');
    if (this._status === 'CLOSED') throw new ConflictError('Account is closed.');
  }

  // ── public accessors ───────────────────────────────────────────────────────

  get exists(): boolean { return !!this._accountId; }
  get id(): string      { return this._accountId; }
  get persistedVersion(): number { return this._persistedVersion; }

  getUncommittedEvents(): ReadonlyArray<UncommittedEvent> {
    return this._uncommittedEvents;
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }

  /** Returns a plain-object snapshot of the current in-memory state */
  toSnapshotData(): BankAccountState {
    return {
      accountId:              this._accountId,
      ownerName:              this._ownerName,
      balance:                this._balance,
      currency:               this._currency,
      status:                 this._status,
      persistedVersion:       this._persistedVersion,
      processedTransactionIds: Array.from(this._processedTransactionIds),
    };
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
