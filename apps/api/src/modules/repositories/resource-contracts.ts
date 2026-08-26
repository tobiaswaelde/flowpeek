import type { AppAbility } from '../../casl/types.js';
import type { Repository, WorkflowRun } from '../../generated/prisma/client.js';
import { RepositoryDto, WorkflowRunDto } from './dto/resource.dto.js';

/** API endpoint response mapping for queryable Flowpeek resources. */
export interface FlowpeekEndpointTypeMap {
  repositories: RepositoryDto;
  workflowRuns: WorkflowRunDto;
}

/** Query Kit mapper contracts used by repository and workflow-run endpoints. */
export const resourceMappers = {
  repositories: (model: Repository, ability?: AppAbility) => RepositoryDto.fromModel(model, ability),
  workflowRuns: (model: WorkflowRun, ability?: AppAbility) => WorkflowRunDto.fromModel(model, ability),
};
