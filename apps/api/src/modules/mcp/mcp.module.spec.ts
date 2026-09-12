import { Test } from '@nestjs/testing';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { McpTokensController } from './mcp-tokens.controller.js';
import { McpController } from './mcp.controller.js';
import { McpModule } from './mcp.module.js';

describe('McpModule', () => {
  it('resolves authenticated controller guards and services', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule, McpModule] }).compile();

    expect(moduleRef.get(McpController)).toBeInstanceOf(McpController);
    expect(moduleRef.get(McpTokensController)).toBeInstanceOf(McpTokensController);

    await moduleRef.close();
  });
});
