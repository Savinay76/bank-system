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
export declare class CreateAccountCommandHandler {
    private readonly repository;
    private readonly eventStore;
    constructor(repository: BankAccountRepository, eventStore: EventStore);
    handle(cmd: CreateAccountCommand): Promise<void>;
}
