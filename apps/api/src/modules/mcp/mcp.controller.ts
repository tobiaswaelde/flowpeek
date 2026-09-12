import type { AuthInfo } from '@modelcontextprotocol/server';
import { Controller, HttpStatus, Post, Req, Res, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { ENV } from '../../config/env.js';
import { getCorsOrigins } from '../../config/http.js';
import { McpHttpService } from './mcp-http.service.js';
import { McpTokenService } from './mcp-token.service.js';

type AuthenticatedMcpRequest = Request & { auth?: AuthInfo };

/** Serves authenticated stateless MCP requests outside the versioned REST API prefix. */
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(
    private readonly http: McpHttpService,
    private readonly tokens: McpTokenService,
  ) {}

  @Post()
  @Version(VERSION_NEUTRAL)
  async handle(@Req() request: AuthenticatedMcpRequest, @Res() response: Response): Promise<void> {
    if (request.originalUrl.includes('?')) {
      response.status(HttpStatus.BAD_REQUEST).json({ message: 'MCP query parameters are not supported.' });
      return;
    }
    if (!this.isAllowedOrigin(request.headers.origin)) {
      response.status(HttpStatus.FORBIDDEN).json({ message: 'Origin is not allowed.' });
      return;
    }

    const token = this.getBearerToken(request.headers.authorization);
    if (!token) {
      this.unauthorized(response);
      return;
    }

    const authenticated = await this.tokens.authenticate(token).catch(() => undefined);
    if (!authenticated) {
      this.unauthorized(response);
      return;
    }

    request.auth = {
      clientId: authenticated.record.id,
      ...(authenticated.expiresAt ? { expiresAt: Math.floor(authenticated.expiresAt.getTime() / 1000) } : {}),
      extra: { user: authenticated.user },
      scopes: ['ezrepo:read'],
      token,
    };
    await this.http.nodeHandler(request, response, request.body);
  }

  private getBearerToken(header?: string): string | undefined {
    const match = /^Bearer ([^\s]+)$/.exec(header ?? '');
    return match?.[1];
  }

  private isAllowedOrigin(origin?: string): boolean {
    if (!origin) return true;
    const allowed = getCorsOrigins(ENV.CORS_ORIGIN);
    return allowed === true || allowed.includes(origin);
  }

  private unauthorized(response: Response): void {
    response.setHeader('WWW-Authenticate', 'Bearer');
    response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized.' });
  }
}
