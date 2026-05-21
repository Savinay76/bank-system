import { BankAccountRepository } from '../BankAccountRepository';

export interface WithdrawMoneyCommand {
  accountId: string;
  amount: number;
  description?: string;
  transactionId: string;
}

/**
 * WithdrawMoneyCommandHandler
 *
 * Loads the aggregate, validates the withdrawal (amount > 0, account open,
 * sufficient balance), records a MoneyWithdrawn event, and persists.
 *
 * Insufficient-funds violations surface as ConflictError (HTTP 409).
 */
export class WithdrawMoneyCommandHandler {
  constructor(private readonly repository: BankAccountRepository) {}

  async handle(cmd: WithdrawMoneyCommand): Promise<void> {
    const account = await this.repository.loadOrThrow(cmd.accountId);

    account.withdraw({
      amount:        cmd.amount,
      description:   cmd.description,
      transactionId: cmd.transactionId,
    });

    await this.repository.save(account);
  }
}
