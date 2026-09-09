import { Injectable } from '@nestjs/common';
import {
  QueryService,
  createCaslAccessibleWhere,
  type BaseDelegateTypeMap,
  type QueryOptionsMap,
} from '@querry-kit/nest';

import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { CaslAction } from '../../casl/casl-action.js';
import { CaslSubject } from '../../casl/casl-subject.js';
import type { AppAbility } from '../../casl/types.js';
import type { Prisma, WorkflowRun } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import type { WorkflowRunQueryDto } from './dto/workflow-run-query.dto.js';

const terminalWorkflowRunStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] as const;

const needsAttentionCandidateWhere = {
  awaitingApproval: false,
  completedAt: { not: null },
  status: { in: [...terminalWorkflowRunStatuses] },
  workflow: { kind: 'STANDARD' },
} satisfies Prisma.WorkflowRunWhereInput;

type LatestTerminalWorkflowRun = Pick<WorkflowRun, 'id' | 'status'>;

/** Prisma delegate type map used by Query Kit for workflow-run resources. */
export interface WorkflowRunTypeMap extends BaseDelegateTypeMap {
  select: Prisma.WorkflowRunSelect;
  include: Prisma.WorkflowRunInclude;
  whereInput: Prisma.WorkflowRunWhereInput;
  orderByWithRelationInput: Prisma.WorkflowRunOrderByWithRelationInput;
  whereUniqueInput: Prisma.WorkflowRunWhereUniqueInput;
  scalarFieldEnum: Prisma.WorkflowRunScalarFieldEnum;
  createInput: Prisma.WorkflowRunCreateInput;
  uncheckedCreateInput: Prisma.WorkflowRunUncheckedCreateInput;
  updateManyMutationInput: Prisma.WorkflowRunUpdateManyMutationInput;
  uncheckedUpdateManyInput: Prisma.WorkflowRunUncheckedUpdateManyInput;
  updateInput: Prisma.WorkflowRunUpdateInput;
  uncheckedUpdateInput: Prisma.WorkflowRunUncheckedUpdateInput;
  aggregateInputType: Prisma.WorkflowRunAggregateArgs;
}

/** Query Kit service that restricts every workflow-run query to visible repositories. */
@Injectable()
export class WorkflowRunsQueryService extends QueryService<
  typeof PrismaService.prototype.workflowRun,
  WorkflowRunTypeMap,
  typeof PrismaService.prototype.workflowRun,
  QueryOptionsMap<WorkflowRunTypeMap>,
  AppAbility,
  CaslSubject.WorkflowRun
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {
    super(prisma.workflowRun, {
      subject: CaslSubject.WorkflowRun,
      accessibleWhere: createCaslAccessibleWhere<AppAbility, CaslSubject.WorkflowRun, CaslAction>({
        action: CaslAction.Read,
      }),
    });
  }

  /**
   * Resolve the current user's repository-scoped workflow-run read ability.
   *
   * @param user - Authenticated API user.
   * @returns Ability used to constrain database queries.
   */
  async getReadAbility(user: AuthenticatedUser): Promise<AppAbility> {
    const memberships = await this.prisma.repositoryMembership.findMany({
      where: { userId: user.id },
      select: { repositoryId: true, role: true },
    });
    return this.abilityFactory.createForUser(user, memberships);
  }

  /**
   * Convert the public query DTO into safe Query Kit options.
   *
   * @param query - Parsed run query request.
   * @returns Query Kit options with a case-insensitive workflow-name search.
   */
  toQueryOptions(query: WorkflowRunQueryDto): QueryOptionsMap<WorkflowRunTypeMap>['query'] {
    const { search, where, ...options } = query;
    const searchWhere: Prisma.WorkflowRunWhereInput | undefined = search
      ? {
          OR: [
            { displayTitle: { contains: search, mode: 'insensitive' } },
            { providerRunId: { contains: search, mode: 'insensitive' } },
            { repository: { name: { contains: search, mode: 'insensitive' } } },
            { repository: { owner: { contains: search, mode: 'insensitive' } } },
            { workflowName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    return {
      ...options,
      where: searchWhere ? { AND: [where ?? {}, searchWhere] } : where,
      orderBy: query.orderBy ?? [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
    };
  }

  /**
   * Build a Query Kit query for the latest failed terminal run of every visible workflow execution context.
   *
   * @param query - Parsed public Query Kit request.
   * @param ability - Repository-scoped read ability.
   * @returns Query options constrained to the canonical needs-attention result set.
   */
  async toNeedsAttentionQueryOptions(
    query: WorkflowRunQueryDto,
    ability: AppAbility,
  ): Promise<QueryOptionsMap<WorkflowRunTypeMap>['query']> {
    const options = this.toQueryOptions(query);
    return {
      ...options,
      where: this.combineWhere(await this.getNeedsAttentionWhere(ability), options.where),
    };
  }

  /**
   * Read current needs-attention runs while preserving repository authorization and deterministic ordering.
   *
   * @param options - Prisma-compatible selection, relations, ordering, and limit.
   * @param ability - Repository-scoped read ability.
   * @returns Visible latest terminal failures.
   */
  async findNeedsAttention<T = unknown>(
    options: QueryOptionsMap<WorkflowRunTypeMap>['findMany'],
    ability: AppAbility,
  ): Promise<T[]> {
    return this.findMany<T>(
      {
        ...options,
        orderBy: options.orderBy ?? [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
        where: this.combineWhere(await this.getNeedsAttentionWhere(ability), options.where),
      },
      ability,
    );
  }

  /** Resolve authorized IDs whose newest completed run failed without exposing inaccessible workflow contexts. */
  private async getNeedsAttentionWhere(ability: AppAbility): Promise<Prisma.WorkflowRunWhereInput> {
    const latestTerminalRuns = await this.findMany<LatestTerminalWorkflowRun>(
      {
        distinct: ['workflowId', 'scopeKey'],
        orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, status: true },
        where: needsAttentionCandidateWhere,
      },
      ability,
    );

    return { id: { in: latestTerminalRuns.filter((run) => run.status === 'FAILED').map((run) => run.id) } };
  }

  /** Combine an invariant resource predicate with an optional public Query Kit predicate. */
  private combineWhere(
    invariant: Prisma.WorkflowRunWhereInput,
    requested?: Prisma.WorkflowRunWhereInput,
  ): Prisma.WorkflowRunWhereInput {
    return requested ? { AND: [invariant, requested] } : invariant;
  }
}
