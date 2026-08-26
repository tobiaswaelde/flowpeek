import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponses,
  ApiPaginatedResponse,
  ApiResourceQuery,
  QueryTransformPipe,
  ResourceQuery,
} from '@querry-kit/nest';

import type { WorkflowRun } from '../../generated/prisma/client.js';
import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowRunDto } from '../repositories/dto/resource.dto.js';
import { WorkflowRunQueryDto } from './dto/workflow-run-query.dto.js';
import { WorkflowRunsQueryService } from './workflow-runs-query.service.js';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

/** Provides paginated workflow-run history for repositories visible to the caller. */
@ApiTags('workflow-runs')
@Authenticated()
@Controller('workflow-runs')
export class WorkflowRunsController {
  constructor(private readonly workflowRuns: WorkflowRunsQueryService) {}

  /**
   * Query visible workflow runs with pagination, filtering, sorting, and workflow-name search.
   *
   * @param request - Authenticated request user.
   * @param query - Query Kit resource query parameters.
   * @returns A projected, paginated workflow-run response.
   */
  @Get()
  @ApiOperation({ summary: 'Query visible workflow runs' })
  @ApiResourceQuery()
  @ApiPaginatedResponse({ description: 'Visible workflow runs.', model: WorkflowRunDto })
  @ApiErrorResponses({ badRequestDescription: 'Invalid workflow-run query.' })
  async query(@Req() request: AuthenticatedRequest, @Query(new QueryTransformPipe()) query: WorkflowRunQueryDto) {
    const ability = await this.workflowRuns.getReadAbility(request.user);
    return ResourceQuery.query({
      ability,
      map: (workflowRun: WorkflowRun, currentAbility) => WorkflowRunDto.fromModel(workflowRun, currentAbility),
      query: this.workflowRuns.toQueryOptions(query),
      schema: WorkflowRunDto,
      service: this.workflowRuns,
    });
  }
}
