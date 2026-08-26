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
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import type { WorkflowRunQueryDto } from './dto/workflow-run-query.dto.js';

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
      ? { workflowName: { contains: search, mode: 'insensitive' } }
      : undefined;

    return {
      ...options,
      where: searchWhere ? { AND: [where ?? {}, searchWhere] } : where,
      orderBy: query.orderBy ?? [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
    };
  }
}
