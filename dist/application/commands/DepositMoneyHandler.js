"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositMoneyCommandHandler = void 0;
/**
 * DepositMoneyCommandHandler
 *
 * Loads the aggregate (from snapshot + events), validates the deposit
 * (amount > 0, account open), records a MoneyDeposited event, and persists.
 *
 * Idempotency: if the same transactionId has already been processed,
 * the aggregate silently skips producing a new event.
 */
class DepositMoneyCommandHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async handle(cmd) {
        const account = await this.repository.loadOrThrow(cmd.accountId);
        account.deposit({
            amount: cmd.amount,
            description: cmd.description,
            transactionId: cmd.transactionId,
        });
        await this.repository.save(account);
    }
}
exports.DepositMoneyCommandHandler = DepositMoneyCommandHandler;
//# sourceMappingURL=DepositMoneyHandler.js.map