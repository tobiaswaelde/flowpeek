import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { RepositoryConfigurationService } from './repository-configuration.service.js';

describe('RepositoryConfigurationService', () => {
  const repository = { id: 'repository-id' };
  const prisma = {
    repository: { findUnique: jest.fn() },
    repositoryMembership: { delete: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn() },
    workflowFilter: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  };
  const filters = { validatePattern: jest.fn() };
  const service = new RepositoryConfigurationService(prisma as never, filters as never);
  const administrator = { id: 'administrator', role: 'SYSTEM_ADMIN' as const, username: 'admin' };
  const manager = { id: 'manager', role: 'MANAGER' as const, username: 'manager' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.repository.findUnique.mockResolvedValue(repository);
  });

  it('rejects non-administrators before reading repository configuration', async () => {
    await expect(service.listWorkflowFilters(manager, repository.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.repository.findUnique).not.toHaveBeenCalled();
  });

  it('validates a workflow pattern before creating a filter', async () => {
    prisma.workflowFilter.create.mockResolvedValue({ id: 'filter-id', mode: 'DENY', pattern: 'draft-*' });

    await service.createWorkflowFilter(administrator, repository.id, { mode: 'DENY', pattern: ' draft-* ' });

    expect(filters.validatePattern).toHaveBeenCalledWith(' draft-* ');
    expect(prisma.workflowFilter.create).toHaveBeenCalledWith({
      data: { mode: 'DENY', pattern: 'draft-*', repositoryId: repository.id },
    });
  });

  it('rejects a workflow-filter removal outside the selected repository', async () => {
    prisma.workflowFilter.findFirst.mockResolvedValue(null);

    await expect(service.deleteWorkflowFilter(administrator, repository.id, 'filter-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.workflowFilter.delete).not.toHaveBeenCalled();
  });

  it('upserts a verified user membership for the selected repository', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
    prisma.repositoryMembership.upsert.mockResolvedValue({
      id: 'membership-id',
      repositoryId: repository.id,
      userId: 'user-id',
    });

    await service.upsertMembership(administrator, repository.id, { role: 'MANAGER', userId: 'user-id' });

    expect(prisma.repositoryMembership.upsert).toHaveBeenCalledWith({
      where: { userId_repositoryId: { repositoryId: repository.id, userId: 'user-id' } },
      create: { repositoryId: repository.id, role: 'MANAGER', userId: 'user-id' },
      update: { role: 'MANAGER' },
      include: { user: true },
    });
  });

  it('does not create a membership for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.upsertMembership(administrator, repository.id, { role: 'VIEWER', userId: 'missing-user' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.repositoryMembership.upsert).not.toHaveBeenCalled();
  });
});
