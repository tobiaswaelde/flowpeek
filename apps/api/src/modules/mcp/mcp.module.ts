import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { WorkflowRunsModule } from '../workflow-runs/workflow-runs.module.js';
import { McpHttpService } from './mcp-http.service.js';
import { McpServerFactory } from './mcp-server.factory.js';
import { McpTokenService } from './mcp-token.service.js';
import { McpTokensController } from './mcp-tokens.controller.js';
import { McpToolsService } from './mcp-tools.service.js';
import { McpController } from './mcp.controller.js';

@Module({
  controllers: [McpController, McpTokensController],
  imports: [CaslModule, DashboardModule, RepositoriesModule, WorkflowRunsModule],
  providers: [McpHttpService, McpServerFactory, McpTokenService, McpToolsService],
})
export class McpModule {}
