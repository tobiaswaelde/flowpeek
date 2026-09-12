import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { CreatedMcpAccessTokenDto, CreateMcpAccessTokenDto, McpAccessTokenDto } from './dto/mcp-access-token.dto.js';
import { McpTokenService } from './mcp-token.service.js';

class ListMcpAccessTokensQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}

/** Provides self-service MCP token management and administrator revocation. */
@ApiTags('mcp-tokens')
@Authenticated()
@Controller('mcp-tokens')
export class McpTokensController {
  constructor(private readonly tokens: McpTokenService) {}

  @Get()
  @ApiOperation({ summary: 'List safe MCP token metadata' })
  @ApiOkResponse({ type: McpAccessTokenDto, isArray: true })
  list(
    @Req() request: { user: AuthenticatedUser },
    @Query() query: ListMcpAccessTokensQueryDto,
  ): Promise<McpAccessTokenDto[]> {
    return this.tokens.list(request.user, query.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user-owned MCP token' })
  @ApiCreatedResponse({ type: CreatedMcpAccessTokenDto })
  create(
    @Req() request: { user: AuthenticatedUser },
    @Body() body: CreateMcpAccessTokenDto,
  ): Promise<CreatedMcpAccessTokenDto> {
    return this.tokens.create(request.user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke an MCP token' })
  async revoke(@Req() request: { user: AuthenticatedUser }, @Param('id') id: string): Promise<void> {
    await this.tokens.revoke(request.user, id);
  }
}
