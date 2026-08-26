import { ApiProperty } from '@nestjs/swagger';

import type { ProviderAccount, Repository, WorkflowRun } from '../../../generated/prisma/client.js';

/** Safe provider identity displayed alongside a dashboard workflow run. */
export class DashboardProviderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['GITHUB', 'GITLAB', 'FORGEJO'] })
  providerType!: ProviderAccount['providerType'];

  @ApiProperty()
  displayName!: string;
}

/** Safe repository identity and link displayed alongside a dashboard workflow run. */
export class DashboardRepositoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  url!: string;
}

/** Dashboard representation of a workflow run with repository and provider context. */
export class DashboardWorkflowRunDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  providerRunId!: string;

  @ApiProperty()
  workflowName!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  providerCreatedAt!: Date;

  @ApiProperty({ nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ nullable: true })
  durationMs!: number | null;

  @ApiProperty({ enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] })
  status!: WorkflowRun['status'];

  @ApiProperty({ type: DashboardRepositoryDto })
  repository!: DashboardRepositoryDto;

  @ApiProperty({ type: DashboardProviderDto })
  provider!: DashboardProviderDto;

  /** Map a loaded dashboard workflow run to its explicit safe public representation. */
  static fromModel(model: DashboardWorkflowRunModel): DashboardWorkflowRunDto {
    return {
      id: model.id,
      providerRunId: model.providerRunId,
      workflowName: model.workflowName,
      url: model.url,
      providerCreatedAt: model.providerCreatedAt,
      startedAt: model.startedAt,
      completedAt: model.completedAt,
      durationMs: model.durationMs,
      status: model.status,
      repository: {
        id: model.repository.id,
        owner: model.repository.owner,
        name: model.repository.name,
        url: model.repository.url,
      },
      provider: {
        id: model.repository.providerAccount.id,
        providerType: model.repository.providerAccount.providerType,
        displayName: model.repository.providerAccount.displayName,
      },
    };
  }
}

/** Workflow run with the safe repository and provider relations required by the dashboard. */
export type DashboardWorkflowRunModel = WorkflowRun & {
  repository: Pick<Repository, 'id' | 'name' | 'owner' | 'url'> & {
    providerAccount: Pick<ProviderAccount, 'displayName' | 'id' | 'providerType'>;
  };
};
