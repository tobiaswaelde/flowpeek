import { filterCaslFields } from '@querry-kit/nest/casl';

import { CaslAction } from '../../../casl/casl-action.js';
import { CaslSubject } from '../../../casl/casl-subject.js';
import type { AppAbility } from '../../../casl/types.js';
import type { ProviderAccount, Repository, WorkflowFilter, WorkflowRun } from '../../../generated/prisma/client.js';

/** Public provider-account representation that deliberately excludes its access token. */
export class ProviderAccountDto {
  id!: string;
  providerType!: ProviderAccount['providerType'];
  displayName!: string;
  baseUrl!: string | null;
  enabled!: boolean;
  lastSyncAt!: Date | null;

  /** Convert a provider account to its safe public representation. */
  static fromModel(model: ProviderAccount, ability?: AppAbility): ProviderAccountDto {
    return filterCaslFields(
      {
        id: model.id,
        providerType: model.providerType,
        displayName: model.displayName,
        baseUrl: model.baseUrl,
        enabled: model.enabled,
        lastSyncAt: model.lastSyncAt,
      },
      CaslSubject.ProviderAccount,
      ability,
      { action: CaslAction.Read },
    );
  }
}

/** Public tracked-repository representation. */
export class RepositoryDto {
  id!: string;
  providerRepositoryId!: string;
  owner!: string;
  name!: string;
  url!: string;
  enabled!: boolean;
  lastSyncAt!: Date | null;
  workflowRunRetentionDays!: number | null;
  providerAccountId!: string;

  /** Convert a tracked repository to a permission-filtered API response. */
  static fromModel(model: Repository, ability?: AppAbility): RepositoryDto {
    return filterCaslFields(
      {
        id: model.id,
        providerRepositoryId: model.providerRepositoryId,
        owner: model.owner,
        name: model.name,
        url: model.url,
        enabled: model.enabled,
        lastSyncAt: model.lastSyncAt,
        workflowRunRetentionDays: model.workflowRunRetentionDays,
        providerAccountId: model.providerAccountId,
      },
      CaslSubject.Repository,
      ability,
      { action: CaslAction.Read },
    );
  }
}

/** Public workflow-run representation used by dashboard and history endpoints. */
export class WorkflowRunDto {
  id!: string;
  providerRunId!: string;
  workflowName!: string;
  url!: string;
  providerCreatedAt!: Date;
  startedAt!: Date | null;
  completedAt!: Date | null;
  durationMs!: number | null;
  status!: WorkflowRun['status'];
  repositoryId!: string;

  /** Convert a normalized provider run to a permission-filtered API response. */
  static fromModel(model: WorkflowRun, ability?: AppAbility): WorkflowRunDto {
    return filterCaslFields(
      {
        id: model.id,
        providerRunId: model.providerRunId,
        workflowName: model.workflowName,
        url: model.url,
        providerCreatedAt: model.providerCreatedAt,
        startedAt: model.startedAt,
        completedAt: model.completedAt,
        durationMs: model.durationMs,
        status: model.status,
        repositoryId: model.repositoryId,
      },
      CaslSubject.WorkflowRun,
      ability,
      { action: CaslAction.Read },
    );
  }
}

/** Public workflow filter representation. */
export class WorkflowFilterDto {
  id!: string;
  pattern!: string;
  mode!: WorkflowFilter['mode'];
  repositoryId!: string;

  /** Convert a workflow filter to a repository-scoped API response. */
  static fromModel(model: WorkflowFilter, ability?: AppAbility): WorkflowFilterDto {
    return filterCaslFields(
      { id: model.id, pattern: model.pattern, mode: model.mode, repositoryId: model.repositoryId },
      CaslSubject.Repository,
      ability,
      { action: CaslAction.Read },
    );
  }
}
