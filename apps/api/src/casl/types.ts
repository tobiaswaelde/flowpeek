import type { Ability, ForcedSubject } from '@casl/ability';

import type { CaslAction } from './casl-action.js';
import type { FlowpeekPrismaQuery } from './casl-prisma.js';
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
export type AppAbility = Ability<
  [CaslAction, CaslSubject | RepositoryAbilitySubject | WorkflowRunAbilitySubject],
  FlowpeekPrismaQuery
>;

/** Repository access resolved from a user's persisted membership. */
export interface RepositoryAccess {
  repositoryId: string;
  role: 'VIEWER' | 'MANAGER';
}
