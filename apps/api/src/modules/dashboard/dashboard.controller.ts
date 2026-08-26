import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowRunDto } from '../repositories/dto/resource.dto.js';
import { DashboardService } from './dashboard.service.js';
import { WorkflowRunTrendBucketDto, WorkflowRunTrendQueryDto } from './dto/workflow-run-trend.dto.js';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

/** Provides aggregated dashboard information for repositories visible to the caller. */
@ApiTags('dashboard')
@Authenticated()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * List visible workflows whose latest terminal run failed.
   *
   * @param request - Authenticated request user.
   * @returns Current failed workflow runs, one per repository and workflow name.
   */
  @Get('failures')
  @ApiOperation({ summary: 'List workflows whose latest terminal run failed' })
  @ApiOkResponse({ description: 'Visible latest failed workflow runs.', type: WorkflowRunDto, isArray: true })
  async getLatestFailures(@Req() request: AuthenticatedRequest): Promise<WorkflowRunDto[]> {
    const failures = await this.dashboard.getLatestFailures(request.user);
    return failures.map((workflowRun) => WorkflowRunDto.fromModel(workflowRun));
  }

  /**
   * List the ten newest workflow runs visible to the caller.
   *
   * @param request - Authenticated request user.
   * @returns The ten most recently created visible provider runs.
   */
  @Get('latest-runs')
  @ApiOperation({ summary: 'List the ten newest visible workflow runs' })
  @ApiOkResponse({ description: 'The ten newest visible workflow runs.', type: WorkflowRunDto, isArray: true })
  async getLatestRuns(@Req() request: AuthenticatedRequest): Promise<WorkflowRunDto[]> {
    const workflowRuns = await this.dashboard.getLatestRuns(request.user);
    return workflowRuns.map((workflowRun) => WorkflowRunDto.fromModel(workflowRun));
  }

  /**
   * Aggregate visible completed runs into success and error buckets for a requested time range.
   *
   * @param request - Authenticated request user.
   * @param query - Requested time range and UTC bucket size.
   * @returns Continuous success and error trend buckets.
   */
  @Get('trend')
  @ApiOperation({ summary: 'Get success and error workflow-run trend buckets' })
  @ApiOkResponse({ description: 'Visible workflow-run trend buckets.', type: WorkflowRunTrendBucketDto, isArray: true })
  async getTrend(
    @Req() request: AuthenticatedRequest,
    @Query() query: WorkflowRunTrendQueryDto,
  ): Promise<WorkflowRunTrendBucketDto[]> {
    return this.dashboard.getTrend(request.user, query);
  }
}
