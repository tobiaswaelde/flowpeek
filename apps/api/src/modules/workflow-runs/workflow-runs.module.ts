import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { WorkflowRunsQueryService } from './workflow-runs-query.service.js';
import { WorkflowRunsController } from './workflow-runs.controller.js';

@Module({
  imports: [CaslModule],
  controllers: [WorkflowRunsController],
  providers: [WorkflowRunsQueryService],
  exports: [WorkflowRunsQueryService],
})
export class WorkflowRunsModule {}
