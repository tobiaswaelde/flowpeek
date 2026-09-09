import { QueryDTO } from '@querry-kit/nest';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { ProviderAccountTypeMap } from '../provider-accounts-query.service.js';

/** Paginated Query Kit request for provider-account administration. */
export class ProviderAccountQueryDto extends QueryDTO<ProviderAccountTypeMap> {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  @Transform(({ value }: { value: string }) => value.trim())
  search?: string;
}
