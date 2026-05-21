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
export declare class WithdrawMoneyCommandHandler {
    private readonly repository;
    constructor(repository: BankAccountRepository);
    handle(cmd: WithdrawMoneyCommand): Promise<void>;
}
