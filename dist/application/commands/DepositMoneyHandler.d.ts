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
export declare class DepositMoneyCommandHandler {
    private readonly repository;
    constructor(repository: BankAccountRepository);
    handle(cmd: DepositMoneyCommand): Promise<void>;
}
