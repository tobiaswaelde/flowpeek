import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { ProviderAccountDto } from '../repositories/dto/resource.dto.js';
import { ProviderAccountsService } from './provider-accounts.service.js';

class CreateProviderAccountDto {
  @IsEnum(['GITHUB', 'GITLAB', 'FORGEJO']) providerType!: 'GITHUB' | 'GITLAB' | 'FORGEJO';
  @IsString() @MaxLength(255) displayName!: string;
  @IsString() @MinLength(1) @MaxLength(4096) accessToken!: string;
  @IsOptional() @IsUrl() baseUrl?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(4096) webhookSecret?: string;
}
class UpdateProviderAccountDto {
  @IsOptional() @IsString() @MaxLength(255) displayName?: string;
  @IsOptional() @IsUrl() baseUrl?: string | null;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(4096) accessToken?: string;
  @IsOptional() @IsString() @MaxLength(4096) webhookSecret?: string;
  @IsOptional() @IsBoolean() clearWebhookSecret?: boolean;
}
@Authenticated()
@Controller('provider-accounts')
export class ProviderAccountsController {
  constructor(private readonly accounts: ProviderAccountsService) {}
  @Get() async list(@Req() req: { user: AuthenticatedUser }): Promise<ProviderAccountDto[]> {
    return (await this.accounts.list(req.user)).map((account) => ProviderAccountDto.fromModel(account));
  }
  @Post() async create(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: CreateProviderAccountDto,
  ): Promise<ProviderAccountDto> {
    return ProviderAccountDto.fromModel(await this.accounts.create(req.user, body));
  }
  @Patch(':id') async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: UpdateProviderAccountDto,
  ): Promise<ProviderAccountDto> {
    return ProviderAccountDto.fromModel(await this.accounts.update(req.user, id, body));
  }
  @Delete(':id') @HttpCode(204) async remove(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.accounts.remove(req.user, id);
  }
}
