import { BankAccountRepository } from '../BankAccountRepository';

export interface DepositMoneyCommand {
  accountId: string;
  amount: number;
  description?: string;
  transactionId: string;
}

/**
 * DepositMoneyCommandHandler
 *
 * Loads the aggregate (from snapshot + events), validates the deposit
 * (amount > 0, account open), records a MoneyDeposited event, and persists.
 *
 * Idempotency: if the same transactionId has already been processed,
 * the aggregate silently skips producing a new event.
 */
export class DepositMoneyCommandHandler {
  constructor(private readonly repository: BankAccountRepository) {}

  async handle(cmd: DepositMoneyCommand): Promise<void> {
    const account = await this.repository.loadOrThrow(cmd.accountId);

    account.deposit({
      amount:        cmd.amount,
      description:   cmd.description,
      transactionId: cmd.transactionId,
    });

    await this.repository.save(account);
  }
}
