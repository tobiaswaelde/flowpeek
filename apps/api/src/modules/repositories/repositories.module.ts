import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { RepositoriesController } from './repositories.controller.js';

import { RepositoriesQueryService } from './repositories-query.service.js';
import { RepositoryConfigurationService } from './repository-configuration.service.js';
import { WorkflowFilterService } from './workflow-filter.service.js';

@Module({
  imports: [CaslModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesQueryService, RepositoryConfigurationService, WorkflowFilterService],
  exports: [RepositoriesQueryService, RepositoryConfigurationService, WorkflowFilterService],
})
export class RepositoriesModule {}
