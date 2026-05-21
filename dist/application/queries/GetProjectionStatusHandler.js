"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProjectionStatusQueryHandler = void 0;
/**
 * GetProjectionStatusQueryHandler
 *
 * Returns the health / lag status of all registered projections compared
 * to the current high-water mark in the event store.
 */
class GetProjectionStatusQueryHandler {
    constructor(projectionManager) {
        this.projectionManager = projectionManager;
    }
    async handle() {
        return this.projectionManager.getStatus();
    }
}
exports.GetProjectionStatusQueryHandler = GetProjectionStatusQueryHandler;
//# sourceMappingURL=GetProjectionStatusHandler.js.map