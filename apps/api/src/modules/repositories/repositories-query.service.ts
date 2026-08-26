import { Injectable } from '@nestjs/common';
import {
  QueryService,
  createCaslAccessibleWhere,
  type BaseDelegateTypeMap,
  type QueryOptionsMap,
} from '@querry-kit/nest';

import { CaslAction } from '../../casl/casl-action.js';
import { CaslSubject } from '../../casl/casl-subject.js';
import type { AppAbility } from '../../casl/types.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

interface RepositoryTypeMap extends BaseDelegateTypeMap {
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
  constructor(prisma: PrismaService) {
    super(prisma.repository, {
      subject: CaslSubject.Repository,
      accessibleWhere: createCaslAccessibleWhere<AppAbility, CaslSubject.Repository, CaslAction>({
        action: CaslAction.Read,
      }),
    });
  }
}
