import { QueryDTO } from '@querry-kit/nest';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { WorkflowRunTypeMap } from '../workflow-runs-query.service.js';

/** Paginated workflow-run query with an optional workflow-name search term. */
export class WorkflowRunQueryDto extends QueryDTO<WorkflowRunTypeMap> {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  @Transform(({ value }: { value: string }) => value.trim())
  search?: string;
}
