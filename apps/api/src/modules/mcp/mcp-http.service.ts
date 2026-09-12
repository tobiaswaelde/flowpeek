import { toNodeHandler, type NodeMcpRequestHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, type AuthInfo } from '@modelcontextprotocol/server';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types.js';
import { McpServerFactory } from './mcp-server.factory.js';

/** Owns the stateless MCP v2 request handler shared by the Nest controller. */
@Injectable()
export class McpHttpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpHttpService.name);
  private readonly handler;
  readonly nodeHandler: NodeMcpRequestHandler;

  constructor(factory: McpServerFactory) {
    this.handler = createMcpHandler(({ authInfo }) => factory.create(this.getUser(authInfo)), {
      legacy: 'reject',
      onerror: (error) => this.logger.error(error.message),
    });
    this.nodeHandler = toNodeHandler(this.handler, { onerror: (error) => this.logger.error(error.message) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.handler.close();
  }

  private getUser(authInfo?: AuthInfo): AuthenticatedUser {
    const user = authInfo?.extra?.user as AuthenticatedUser | undefined;
    if (!user) throw new Error('MCP authentication context is missing.');
    return user;
  }
}
