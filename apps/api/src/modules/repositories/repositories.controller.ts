import { Body, Controller, ForbiddenException, Get, Param, Patch, Req } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

import { PrismaService } from '../../prisma/prisma.service.js';
import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { RepositoryDto } from './dto/resource.dto.js';

class UpdateRepositoryDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) workflowRunRetentionDays?: number | null;
}

/** Provides system-administrator tracking settings for persisted repositories. */
@Authenticated()
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Req() request: { user: AuthenticatedUser }): Promise<RepositoryDto[]> {
    this.assertAdmin(request.user);
    return (await this.prisma.repository.findMany({ orderBy: [{ owner: 'asc' }, { name: 'asc' }] })).map((repository) =>
      RepositoryDto.fromModel(repository),
    );
  }
  @Patch(':id') async update(
    @Req() request: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: UpdateRepositoryDto,
  ): Promise<RepositoryDto> {
    this.assertAdmin(request.user);
    return RepositoryDto.fromModel(await this.prisma.repository.update({ where: { id }, data: body }));
  }
  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
  }
}
