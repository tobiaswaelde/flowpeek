import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  Repository,
  RepositoryMembership,
  RepositoryRole,
  UserRole,
  WorkflowFilter,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowFilterService, type WorkflowFilterMode } from './workflow-filter.service.js';

/** System-administrator repository configuration operations. */
@Injectable()
export class RepositoryConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowFilters: WorkflowFilterService,
  ) {}

  /** Get one repository after administrator authorization. */
  async getRepository(user: AuthenticatedUser, repositoryId: string): Promise<Repository> {
    this.assertAdministrator(user);
    return this.requireRepository(repositoryId);
  }

  /** List persisted workflow filters in a stable order. */
  async listWorkflowFilters(user: AuthenticatedUser, repositoryId: string): Promise<WorkflowFilter[]> {
    this.assertAdministrator(user);
    await this.requireRepository(repositoryId);
    return this.prisma.workflowFilter.findMany({
      where: { repositoryId },
      orderBy: [{ mode: 'asc' }, { pattern: 'asc' }],
    });
  }

  /** Validate and persist one workflow filter. */
  async createWorkflowFilter(
    user: AuthenticatedUser,
    repositoryId: string,
    input: { mode: WorkflowFilterMode; pattern: string },
  ): Promise<WorkflowFilter> {
    this.assertAdministrator(user);
    await this.requireRepository(repositoryId);
    this.workflowFilters.validatePattern(input.pattern);
    return this.prisma.workflowFilter.create({
      data: { mode: input.mode, pattern: input.pattern.trim(), repositoryId },
    });
  }

  /** Delete one workflow filter that belongs to the selected repository. */
  async deleteWorkflowFilter(user: AuthenticatedUser, repositoryId: string, filterId: string): Promise<void> {
    this.assertAdministrator(user);
    const filter = await this.prisma.workflowFilter.findFirst({ where: { id: filterId, repositoryId } });
    if (!filter) throw new NotFoundException('Workflow filter not found.');
    await this.prisma.workflowFilter.delete({ where: { id: filterId } });
  }

  /** List every user membership for the selected repository. */
  async listMemberships(
    user: AuthenticatedUser,
    repositoryId: string,
  ): Promise<Array<RepositoryMembership & { user: { id: string; role: UserRole; username: string } }>> {
    this.assertAdministrator(user);
    await this.requireRepository(repositoryId);
    return this.prisma.repositoryMembership.findMany({
      where: { repositoryId },
      include: { user: true },
      orderBy: { user: { username: 'asc' } },
    });
  }

  /** Create or update a repository member role after verifying the target user exists. */
  async upsertMembership(
    user: AuthenticatedUser,
    repositoryId: string,
    input: { role: RepositoryRole; userId: string },
  ): Promise<RepositoryMembership & { user: { id: string; role: UserRole; username: string } }> {
    this.assertAdministrator(user);
    await this.requireRepository(repositoryId);
    const member = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!member) throw new NotFoundException('User not found.');
    return this.prisma.repositoryMembership.upsert({
      where: { userId_repositoryId: { repositoryId, userId: input.userId } },
      create: { repositoryId, role: input.role, userId: input.userId },
      update: { role: input.role },
      include: { user: true },
    });
  }

  /** Remove one repository membership. */
  async deleteMembership(user: AuthenticatedUser, repositoryId: string, userId: string): Promise<void> {
    this.assertAdministrator(user);
    const membership = await this.prisma.repositoryMembership.findUnique({
      where: { userId_repositoryId: { repositoryId, userId } },
    });
    if (!membership) throw new NotFoundException('Repository membership not found.');
    await this.prisma.repositoryMembership.delete({ where: { id: membership.id } });
  }

  /** Reject role or tenant boundaries that may mutate repository access. */
  private assertAdministrator(user: AuthenticatedUser): void {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
  }

  /** Load the target repository with a stable not-found contract. */
  private async requireRepository(repositoryId: string): Promise<Repository> {
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repository) throw new NotFoundException('Repository not found.');
    return repository;
  }
}
