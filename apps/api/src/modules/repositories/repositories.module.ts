import { Module } from '@nestjs/common';

import { RepositoriesQueryService } from './repositories-query.service.js';

@Module({
  providers: [RepositoriesQueryService],
  exports: [RepositoriesQueryService],
})
export class RepositoriesModule {}
