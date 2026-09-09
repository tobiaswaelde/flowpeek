import { ApiProperty } from '@nestjs/swagger';

import { DashboardRepositoryDto } from './dashboard-workflow-run.dto.js';

/** Permission-aware workflow health aggregates for one visible repository. */
export class RepositoryHealthDto {
  @ApiProperty({ type: DashboardRepositoryDto })
  repository!: DashboardRepositoryDto;

  @ApiProperty({ description: 'Number of completed runs in the requested period.' })
  completedCount!: number;

  @ApiProperty({ description: 'Number of failed runs in the requested period.' })
  failedCount!: number;

  @ApiProperty({ description: 'Percentage of successful decided runs.', example: 94.2 })
  successRate!: number;

  @ApiProperty({ description: 'Median persisted duration in milliseconds.', nullable: true })
  medianDurationMs!: number | null;
}
