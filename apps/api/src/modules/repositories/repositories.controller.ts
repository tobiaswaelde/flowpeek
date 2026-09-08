import { Body, Controller, ForbiddenException, Get, Param, Patch, Query, Req } from '@nestjs/common';
import {
  ApiErrorResponses,
  ApiPaginatedResponse,
  ApiResourceQuery,
  QueryTransformPipe,
  ResourceQuery,
} from '@querry-kit/nest';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

import type { Repository } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { RepositoryQueryDto } from './dto/repository-query.dto.js';
import { RepositoryDto } from './dto/resource.dto.js';
import { RepositoriesQueryService } from './repositories-query.service.js';

class UpdateRepositoryDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) workflowRunRetentionDays?: number | null;
}

/** Provides system-administrator tracking settings for persisted repositories. */
@Authenticated()
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repositories: RepositoriesQueryService,
  ) {}

  /** Query repositories with server-side filtering, sorting, field selection, and pagination. */
  @Get()
  @ApiResourceQuery()
  @ApiPaginatedResponse({ description: 'Tracked repositories.', model: RepositoryDto })
  @ApiErrorResponses({ badRequestDescription: 'Invalid repository query.' })
  async query(@Req() request: { user: AuthenticatedUser }, @Query(new QueryTransformPipe()) query: RepositoryQueryDto) {
    const ability = this.repositories.getReadAbility(request.user);
    return ResourceQuery.query({
      ability,
      map: (repository: Repository, currentAbility) => RepositoryDto.fromModel(repository, currentAbility),
      query: this.repositories.toQueryOptions(query),
      schema: RepositoryDto,
      service: this.repositories,
    });
  }
  @Patch(':id') async update(
    @Req() request: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: UpdateRepositoryDto,
  ): Promise<RepositoryDto> {
    this.assertAdmin(request.user);
    return RepositoryDto.fromModel(await this.prisma.repository.update({ where: { id }, data: body }));
  }
  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
  }
}
