import { Module } from '@nestjs/common';

import { RepositoriesController } from './repositories.controller.js';

import { RepositoriesQueryService } from './repositories-query.service.js';
import { WorkflowFilterService } from './workflow-filter.service.js';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesQueryService, WorkflowFilterService],
  exports: [RepositoriesQueryService, WorkflowFilterService],
})
export class RepositoriesModule {}
