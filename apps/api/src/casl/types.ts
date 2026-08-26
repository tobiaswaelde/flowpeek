import type { ForcedSubject, MongoAbility } from '@casl/ability';

import type { CaslAction } from './casl-action.js';
import type { CaslSubject } from './casl-subject.js';

/** Repository properties used by repository-scoped ability conditions. */
export interface RepositoryAbilitySubject extends ForcedSubject<CaslSubject.Repository> {
  id: string;
}

/** Workflow-run properties used by repository-scoped ability conditions. */
export interface WorkflowRunAbilitySubject extends ForcedSubject<CaslSubject.WorkflowRun> {
  repositoryId: string;
}

/** The CASL ability used by Flowpeek API policies and query restrictions. */
export type AppAbility = MongoAbility<[CaslAction, CaslSubject | RepositoryAbilitySubject | WorkflowRunAbilitySubject]>;

/** Repository access resolved from a user's persisted membership. */
export interface RepositoryAccess {
  repositoryId: string;
  role: 'VIEWER' | 'MANAGER';
}
