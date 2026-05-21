"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RebuildProjectionsHandler = void 0;
/**
 * RebuildProjectionsHandler
 *
 * Administrative command:  wipes all read-model tables and replays the
 * entire event store to rebuild projections from scratch.
 *
 * Use-cases:
 *  - Fixing a bug in a projector's logic.
 *  - Adding a new field to a read model.
 *  - Recovering from database corruption.
 */
class RebuildProjectionsHandler {
    constructor(projectionManager) {
        this.projectionManager = projectionManager;
    }
    async handle() {
        await this.projectionManager.rebuildAll();
        return { message: 'Projection rebuild initiated.' };
    }
}
exports.RebuildProjectionsHandler = RebuildProjectionsHandler;
//# sourceMappingURL=RebuildProjectionsHandler.js.map