import { Controller, Param, Post, Req } from '@nestjs/common';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { RepositoryDto } from '../repositories/dto/resource.dto.js';
import { RepositoryMetadataService } from './repository-metadata.service.js';

/** Provides an explicit administrator action for refreshing provider-owned repository metadata. */
@Authenticated()
@Controller('repositories')
export class RepositoryRefreshController {
  constructor(private readonly metadata: RepositoryMetadataService) {}

  /** Refresh the repository name, namespace, and URL without changing its provider identity. */
  @Post(':id/refresh')
  async refresh(
    @Req() request: { user: AuthenticatedUser },
    @Param('id') repositoryId: string,
  ): Promise<RepositoryDto> {
    return RepositoryDto.fromModel(await this.metadata.refreshById(request.user, repositoryId));
  }
}
