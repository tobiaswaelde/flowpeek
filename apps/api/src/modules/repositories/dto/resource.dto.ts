import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { filterCaslFields } from '@querry-kit/nest/casl';

import { CaslAction } from '../../../casl/casl-action.js';
import { CaslSubject } from '../../../casl/casl-subject.js';
import type { AppAbility } from '../../../casl/types.js';
import type {
  ProviderAccount,
  Repository,
  RepositoryMembership,
  User,
  WorkflowFilter,
  WorkflowRun,
} from '../../../generated/prisma/client.js';

/** Public provider-account representation that deliberately excludes its access token. */
export class ProviderAccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: ['GITHUB', 'GITLAB', 'FORGEJO', 'GITEA'] })
  providerType!: ProviderAccount['providerType'];
  @ApiProperty({ maxLength: 255 })
  displayName!: string;
  @ApiPropertyOptional({ format: 'uri', nullable: true })
  baseUrl!: string | null;
  @ApiProperty()
  enabled!: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
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
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  providerRepositoryId!: string;
  @ApiProperty()
  owner!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ format: 'uri' })
  url!: string;
  @ApiProperty()
  enabled!: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastSyncAt!: Date | null;
  @ApiPropertyOptional({ nullable: true })
  workflowRunRetentionDays!: number | null;
  @ApiProperty({ format: 'uuid' })
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
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  providerRunId!: string;
  @ApiProperty()
  workflowName!: string;
  @ApiProperty({ format: 'uri' })
  url!: string;
  @ApiProperty({ format: 'date-time' })
  providerCreatedAt!: Date;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  startedAt!: Date | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true })
  durationMs!: number | null;
  @ApiProperty({ enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] })
  status!: WorkflowRun['status'];
  @ApiProperty({ format: 'uuid' })
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
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ maxLength: 1024 })
  pattern!: string;
  @ApiProperty({ enum: ['ALLOW', 'DENY'] })
  mode!: WorkflowFilter['mode'];
  @ApiProperty({ format: 'uuid' })
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

/** Safe repository member representation without credential material. */
export class RepositoryMembershipDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: ['VIEWER', 'MANAGER'] })
  role!: RepositoryMembership['role'];
  @ApiProperty({ format: 'uuid' })
  repositoryId!: string;
  @ApiProperty({ format: 'uuid' })
  userId!: string;
  @ApiProperty()
  user!: Pick<User, 'id' | 'role' | 'username'>;

  /** Convert a membership and its safe user relation into a public representation. */
  static fromModel(
    model: RepositoryMembership & { user: Pick<User, 'id' | 'role' | 'username'> },
  ): RepositoryMembershipDto {
    return {
      id: model.id,
      repositoryId: model.repositoryId,
      role: model.role,
      user: { id: model.user.id, role: model.user.role, username: model.user.username },
      userId: model.userId,
    };
  }
}
