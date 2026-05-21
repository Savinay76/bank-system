import { ProjectionManager } from '../../projections/ProjectionManager';

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
export class RebuildProjectionsHandler {
  constructor(private readonly projectionManager: ProjectionManager) {}

  async handle(): Promise<{ message: string }> {
    await this.projectionManager.rebuildAll();
    return { message: 'Projection rebuild initiated.' };
  }
}
