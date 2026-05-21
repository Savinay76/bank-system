"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawMoneyCommandHandler = void 0;
/**
 * WithdrawMoneyCommandHandler
 *
 * Loads the aggregate, validates the withdrawal (amount > 0, account open,
 * sufficient balance), records a MoneyWithdrawn event, and persists.
 *
 * Insufficient-funds violations surface as ConflictError (HTTP 409).
 */
class WithdrawMoneyCommandHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async handle(cmd) {
        const account = await this.repository.loadOrThrow(cmd.accountId);
        account.withdraw({
            amount: cmd.amount,
            description: cmd.description,
            transactionId: cmd.transactionId,
        });
        await this.repository.save(account);
    }
}
exports.WithdrawMoneyCommandHandler = WithdrawMoneyCommandHandler;
//# sourceMappingURL=WithdrawMoneyHandler.js.map