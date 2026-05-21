"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloseAccountCommandHandler = void 0;
/**
 * CloseAccountCommandHandler
 *
 * Loads the aggregate, validates that the balance is zero, records an
 * AccountClosed event, and persists.
 */
class CloseAccountCommandHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async handle(cmd) {
        const account = await this.repository.loadOrThrow(cmd.accountId);
        account.closeAccount({ reason: cmd.reason });
        await this.repository.save(account);
    }
}
exports.CloseAccountCommandHandler = CloseAccountCommandHandler;
//# sourceMappingURL=CloseAccountHandler.js.map