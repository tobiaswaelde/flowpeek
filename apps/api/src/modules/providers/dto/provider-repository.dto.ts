import { ApiProperty } from '@nestjs/swagger';

import type { ProviderRepository } from '../provider-adapter.js';

/** A provider repository that can be added to Flowpeek tracking. */
export class ProviderRepositoryDto {
  @ApiProperty()
  providerRepositoryId!: string;
  @ApiProperty()
  owner!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ format: 'uri' })
  url!: string;
  @ApiProperty({ description: 'Whether this provider repository is already tracked by ezRepo.' })
  tracked!: boolean;

  /** Map a provider response and local tracking state to a safe API response. */
  static fromProvider(repository: ProviderRepository, tracked: boolean): ProviderRepositoryDto {
    return { ...repository, tracked };
  }
}
