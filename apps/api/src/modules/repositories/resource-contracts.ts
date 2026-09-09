import type { AppAbility } from '../../casl/types.js';
import {
  RepositoryDto,
  WorkflowRunDto,
  type RepositoryResourceModel,
  type WorkflowRunResourceModel,
} from './dto/resource.dto.js';

/** API endpoint response mapping for queryable Flowpeek resources. */
export interface FlowpeekEndpointTypeMap {
  repositories: RepositoryDto;
  workflowRuns: WorkflowRunDto;
}

/** Query Kit mapper contracts used by repository and workflow-run endpoints. */
export const resourceMappers = {
  repositories: (model: RepositoryResourceModel, ability?: AppAbility) => RepositoryDto.fromModel(model, ability),
  workflowRuns: (model: WorkflowRunResourceModel, ability?: AppAbility) => WorkflowRunDto.fromModel(model, ability),
};
