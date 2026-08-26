import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

/** UTC granularity used to group completed workflow runs in dashboard trends. */
export const trendBucketSizes = ['hour', 'day', 'week'] as const;
export type TrendBucketSize = (typeof trendBucketSizes)[number];

/** Requested time range and UTC bucket size for the workflow-run trend endpoint. */
export class WorkflowRunTrendQueryDto {
  @ApiProperty({ description: 'Inclusive ISO-8601 start timestamp.' })
  @IsISO8601()
  from!: string;

  @ApiProperty({ description: 'Inclusive ISO-8601 end timestamp.' })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ enum: trendBucketSizes, default: 'day', description: 'UTC aggregation bucket size.' })
  @IsOptional()
  @IsIn(trendBucketSizes)
  bucket: TrendBucketSize = 'day';
}

/** Success and error counts for one UTC trend interval. */
export class WorkflowRunTrendBucketDto {
  @ApiProperty({ description: 'UTC start timestamp of this bucket.' })
  bucketStart!: Date;

  @ApiProperty({ description: 'Number of successful completed workflow runs.' })
  successCount!: number;

  @ApiProperty({ description: 'Number of failed completed workflow runs.' })
  errorCount!: number;
}
