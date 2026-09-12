import { Injectable } from '@nestjs/common';

import type { Prisma, ProviderType, WorkflowRunStatus } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import {
  DashboardWorkflowRunDto,
  type DashboardWorkflowRunModel,
} from '../dashboard/dto/dashboard-workflow-run.dto.js';
import type { TrendBucketSize } from '../dashboard/dto/workflow-run-trend.dto.js';
import {
  RepositoryDto,
  type RepositoryResourceModel,
  WorkflowRunDto,
  type WorkflowRunResourceModel,
} from '../repositories/dto/resource.dto.js';
import { RepositoriesQueryService } from '../repositories/repositories-query.service.js';
import { WorkflowRunsQueryService } from '../workflow-runs/workflow-runs-query.service.js';

const workflowRunContextInclude = {
  repository: {
    select: {
      name: true,
      owner: true,
      providerAccount: { select: { providerType: true } },
    },
  },
} satisfies Prisma.WorkflowRunInclude;
const dashboardRunInclude = {
  repository: {
    select: {
      id: true,
      name: true,
      owner: true,
      providerAccount: { select: { displayName: true, id: true, providerType: true } },
      url: true,
    },
  },
} satisfies Prisma.WorkflowRunInclude;

export interface McpPaginationInput {
  limit: number;
  page: number;
}

export interface McpRepositoryFilters extends McpPaginationInput {
  enabled?: boolean;
  providerType?: ProviderType;
  search?: string;
}

export interface McpWorkflowRunFilters extends McpPaginationInput {
  from?: string;
  providerType?: ProviderType;
  repositoryId?: string;
  search?: string;
  status?: WorkflowRunStatus;
  to?: string;
}

export interface McpPaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
}

/** Executes MCP read tools through the existing permission-aware query services. */
@Injectable()
export class McpToolsService {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly repositories: RepositoriesQueryService,
    private readonly workflowRuns: WorkflowRunsQueryService,
  ) {}

  /** List visible tracked repositories with bounded pagination. */
  async listRepositories(
    user: AuthenticatedUser,
    input: McpRepositoryFilters,
  ): Promise<McpPaginatedResult<RepositoryDto>> {
    const ability = await this.repositories.getReadAbility(user);
    const where = this.repositoryWhere(input);
    const [items, total] = await Promise.all([
      this.repositories.findMany<RepositoryResourceModel>(
        {
          include: { _count: { select: { workflowRuns: true } } },
          orderBy: [{ owner: 'asc' }, { name: 'asc' }, { id: 'asc' }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          where,
        },
        ability,
      ),
      this.repositories.count({ where }, ability),
    ]);
    return this.paginated(
      items.map((item) => RepositoryDto.fromModel(item, ability)),
      total,
      input,
    );
  }

  /** Read one visible tracked repository by ID. */
  async getRepository(user: AuthenticatedUser, repositoryId: string): Promise<RepositoryDto> {
    const ability = await this.repositories.getReadAbility(user);
    const repository = await this.repositories.findById<RepositoryResourceModel>(
      repositoryId,
      { include: { _count: { select: { workflowRuns: true } } } },
      ability,
    );
    return RepositoryDto.fromModel(repository, ability);
  }

  /** List visible workflow runs with bounded pagination and operational filters. */
  async listWorkflowRuns(
    user: AuthenticatedUser,
    input: McpWorkflowRunFilters,
  ): Promise<McpPaginatedResult<WorkflowRunDto>> {
    const ability = await this.workflowRuns.getReadAbility(user);
    const where = this.workflowRunWhere(input);
    const [items, total] = await Promise.all([
      this.workflowRuns.findMany<WorkflowRunResourceModel>(
        {
          include: workflowRunContextInclude,
          orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          where,
        },
        ability,
      ),
      this.workflowRuns.count({ where }, ability),
    ]);
    return this.paginated(
      items.map((item) => WorkflowRunDto.fromModel(item, ability)),
      total,
      input,
    );
  }

  /** List visible workflow contexts whose newest terminal run failed. */
  async listNeedsAttention(
    user: AuthenticatedUser,
    input: McpWorkflowRunFilters,
  ): Promise<McpPaginatedResult<WorkflowRunDto>> {
    const ability = await this.workflowRuns.getReadAbility(user);
    const where = this.workflowRunWhere(input);
    const [items, totalItems] = await Promise.all([
      this.workflowRuns.findNeedsAttention<WorkflowRunResourceModel>(
        {
          include: workflowRunContextInclude,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          where,
        },
        ability,
      ),
      this.workflowRuns.findNeedsAttention<{ id: string }>({ select: { id: true }, where }, ability),
    ]);
    return this.paginated(
      items.map((item) => WorkflowRunDto.fromModel(item, ability)),
      totalItems.length,
      input,
    );
  }

  /** List visible current workflow runs waiting for provider approval. */
  async listAwaitingApproval(
    user: AuthenticatedUser,
    input: McpWorkflowRunFilters,
  ): Promise<McpPaginatedResult<DashboardWorkflowRunDto>> {
    const ability = await this.workflowRuns.getReadAbility(user);
    const where = {
      AND: [this.workflowRunWhere(input), { awaitingApproval: true }],
    } satisfies Prisma.WorkflowRunWhereInput;
    const [items, totalItems] = await Promise.all([
      this.workflowRuns.findCurrent<DashboardWorkflowRunModel>(
        {
          include: dashboardRunInclude,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          where,
        },
        ability,
      ),
      this.workflowRuns.findCurrent<{ id: string }>({ select: { id: true }, where }, ability),
    ]);
    return this.paginated(items.map(DashboardWorkflowRunDto.fromModel), totalItems.length, input);
  }

  /** Return the visible workflow health summary for an inclusive period. */
  getDashboardSummary(user: AuthenticatedUser, from: string, to: string) {
    return this.dashboard.getSummary(user, { from, to });
  }

  /** Return visible workflow success and error trend buckets for an inclusive period. */
  getWorkflowTrend(user: AuthenticatedUser, from: string, to: string, bucket: TrendBucketSize) {
    return this.dashboard.getTrend(user, { bucket, from, to });
  }

  private paginated<T>(items: T[], total: number, input: McpPaginationInput): McpPaginatedResult<T> {
    return { items, page: input.page, perPage: input.limit, total };
  }

  private repositoryWhere(input: McpRepositoryFilters): Prisma.RepositoryWhereInput {
    const searchWhere: Prisma.RepositoryWhereInput | undefined = input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { owner: { contains: input.search, mode: 'insensitive' } },
            { url: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      : undefined;
    return {
      AND: [
        input.enabled === undefined ? {} : { enabled: input.enabled },
        input.providerType ? { providerAccount: { providerType: input.providerType } } : {},
        searchWhere ?? {},
      ],
    };
  }

  private workflowRunWhere(input: McpWorkflowRunFilters): Prisma.WorkflowRunWhereInput {
    const searchWhere: Prisma.WorkflowRunWhereInput | undefined = input.search
      ? {
          OR: [
            { displayTitle: { contains: input.search, mode: 'insensitive' } },
            { providerRunId: { contains: input.search, mode: 'insensitive' } },
            { workflowName: { contains: input.search, mode: 'insensitive' } },
            { repository: { name: { contains: input.search, mode: 'insensitive' } } },
            { repository: { owner: { contains: input.search, mode: 'insensitive' } } },
          ],
        }
      : undefined;
    return {
      AND: [
        input.repositoryId ? { repositoryId: input.repositoryId } : {},
        input.providerType ? { repository: { providerAccount: { providerType: input.providerType } } } : {},
        input.status ? { status: input.status } : {},
        input.from || input.to
          ? {
              providerCreatedAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) },
            }
          : {},
        searchWhere ?? {},
      ],
    };
  }
}
