import { BankAccountRepository } from '../BankAccountRepository';

export interface CloseAccountCommand {
  accountId: string;
  reason: string;
}

/**
 * CloseAccountCommandHandler
 *
 * Loads the aggregate, validates that the balance is zero, records an
 * AccountClosed event, and persists.
 */
export class CloseAccountCommandHandler {
  constructor(private readonly repository: BankAccountRepository) {}

  async handle(cmd: CloseAccountCommand): Promise<void> {
    const account = await this.repository.loadOrThrow(cmd.accountId);

    account.closeAccount({ reason: cmd.reason });

    await this.repository.save(account);
  }
}
