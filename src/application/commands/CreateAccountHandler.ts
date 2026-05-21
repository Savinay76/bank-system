import { BankAccount } from '../../domain/aggregates/BankAccount';
import { ConflictError } from '../../domain/errors';
import { EventStore } from '../../infrastructure/EventStore';
import { BankAccountRepository } from '../BankAccountRepository';

export interface CreateAccountCommand {
  accountId: string;
  ownerName: string;
  initialBalance: number;
  currency: string;
}

/**
 * CreateAccountCommandHandler
 *
 * Checks that the account does not already exist (by querying the event
 * store directly – the aggregate won't exist, so we use aggregateExists()),
 * then applies the command to a fresh aggregate and persists the AccountCreated
 * event.
 */
export class CreateAccountCommandHandler {
  constructor(
    private readonly repository: BankAccountRepository,
    private readonly eventStore: EventStore,
  ) {}

  async handle(cmd: CreateAccountCommand): Promise<void> {
    // Guard: reject duplicate account IDs before even touching the aggregate
    const alreadyExists = await this.eventStore.aggregateExists(cmd.accountId);
    if (alreadyExists) {
      throw new ConflictError(`Account '${cmd.accountId}' already exists.`);
    }

    // Start with a fresh aggregate (version 0, no events)
    const account = new BankAccount();
    account.createAccount({
      accountId:      cmd.accountId,
      ownerName:      cmd.ownerName,
      initialBalance: cmd.initialBalance,
      currency:       cmd.currency,
    });

    await this.repository.save(account);
  }
}
