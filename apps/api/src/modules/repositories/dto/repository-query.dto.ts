import { QueryDTO } from '@querry-kit/nest';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { RepositoryTypeMap } from '../repositories-query.service.js';

/** Paginated Query Kit request for repository administration. */
export class RepositoryQueryDto extends QueryDTO<RepositoryTypeMap> {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  @Transform(({ value }: { value: string }) => value.trim())
  search?: string;
}
