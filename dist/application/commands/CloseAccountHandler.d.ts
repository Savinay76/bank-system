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
export declare class CloseAccountCommandHandler {
    private readonly repository;
    constructor(repository: BankAccountRepository);
    handle(cmd: CloseAccountCommand): Promise<void>;
}
