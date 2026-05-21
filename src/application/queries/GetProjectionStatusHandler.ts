import { ProjectionManager, ProjectionStatus } from '../../projections/ProjectionManager';

export interface ProjectionStatusResult {
  totalEventsInStore: number;
  projections: ProjectionStatus[];
}

/**
 * GetProjectionStatusQueryHandler
 *
 * Returns the health / lag status of all registered projections compared
 * to the current high-water mark in the event store.
 */
export class GetProjectionStatusQueryHandler {
  constructor(private readonly projectionManager: ProjectionManager) {}

  async handle(): Promise<ProjectionStatusResult> {
    return this.projectionManager.getStatus();
  }
}
