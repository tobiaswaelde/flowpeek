import { Module } from '@nestjs/common';

import { WorkflowRunsModule } from '../workflow-runs/workflow-runs.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [WorkflowRunsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
