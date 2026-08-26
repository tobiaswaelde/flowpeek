import { Module } from '@nestjs/common';

import { RepositoriesQueryService } from './repositories-query.service.js';
import { WorkflowFilterService } from './workflow-filter.service.js';

@Module({
  providers: [RepositoriesQueryService, WorkflowFilterService],
  exports: [RepositoriesQueryService, WorkflowFilterService],
})
export class RepositoriesModule {}
