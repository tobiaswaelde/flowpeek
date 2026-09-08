import { ForbiddenException, Injectable } from '@nestjs/common';
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
import type { RepositoryQueryDto } from './dto/repository-query.dto.js';

/** Prisma delegate type map used by Query Kit for tracked repositories. */
export interface RepositoryTypeMap extends BaseDelegateTypeMap {
  select: Prisma.RepositorySelect;
  include: Prisma.RepositoryInclude;
  whereInput: Prisma.RepositoryWhereInput;
  orderByWithRelationInput: Prisma.RepositoryOrderByWithRelationInput;
  whereUniqueInput: Prisma.RepositoryWhereUniqueInput;
  scalarFieldEnum: Prisma.RepositoryScalarFieldEnum;
  createInput: Prisma.RepositoryCreateInput;
  uncheckedCreateInput: Prisma.RepositoryUncheckedCreateInput;
  updateManyMutationInput: Prisma.RepositoryUpdateManyMutationInput;
  uncheckedUpdateManyInput: Prisma.RepositoryUncheckedUpdateManyInput;
  updateInput: Prisma.RepositoryUpdateInput;
  uncheckedUpdateInput: Prisma.RepositoryUncheckedUpdateInput;
  aggregateInputType: Prisma.RepositoryAggregateArgs;
}

/** Query Kit service that always combines repository filters with CASL access. */
@Injectable()
export class RepositoriesQueryService extends QueryService<
  typeof PrismaService.prototype.repository,
  RepositoryTypeMap,
  typeof PrismaService.prototype.repository,
  QueryOptionsMap<RepositoryTypeMap>,
  AppAbility,
  CaslSubject.Repository
> {
  constructor(
    prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {
    super(prisma.repository, {
      subject: CaslSubject.Repository,
      accessibleWhere: createCaslAccessibleWhere<AppAbility, CaslSubject.Repository, CaslAction>({
        action: CaslAction.Read,
      }),
    });
  }

  /** Resolve the full repository read ability for a system administrator. */
  getReadAbility(user: AuthenticatedUser): AppAbility {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
    return this.abilityFactory.createForUser(user, []);
  }

  /** Apply a stable default order when the table has no selected sort. */
  toQueryOptions(query: RepositoryQueryDto): QueryOptionsMap<RepositoryTypeMap>['query'] {
    return { ...query, orderBy: query.orderBy ?? [{ owner: 'asc' }, { name: 'asc' }, { id: 'asc' }] };
  }
}
