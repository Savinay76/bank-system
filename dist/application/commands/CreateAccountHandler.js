"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAccountCommandHandler = void 0;
const BankAccount_1 = require("../../domain/aggregates/BankAccount");
const errors_1 = require("../../domain/errors");
/**
 * CreateAccountCommandHandler
 *
 * Checks that the account does not already exist (by querying the event
 * store directly – the aggregate won't exist, so we use aggregateExists()),
 * then applies the command to a fresh aggregate and persists the AccountCreated
 * event.
 */
class CreateAccountCommandHandler {
    constructor(repository, eventStore) {
        this.repository = repository;
        this.eventStore = eventStore;
    }
    async handle(cmd) {
        // Guard: reject duplicate account IDs before even touching the aggregate
        const alreadyExists = await this.eventStore.aggregateExists(cmd.accountId);
        if (alreadyExists) {
            throw new errors_1.ConflictError(`Account '${cmd.accountId}' already exists.`);
        }
        // Start with a fresh aggregate (version 0, no events)
        const account = new BankAccount_1.BankAccount();
        account.createAccount({
            accountId: cmd.accountId,
            ownerName: cmd.ownerName,
            initialBalance: cmd.initialBalance,
            currency: cmd.currency,
        });
        await this.repository.save(account);
    }
}
exports.CreateAccountCommandHandler = CreateAccountCommandHandler;
//# sourceMappingURL=CreateAccountHandler.js.map