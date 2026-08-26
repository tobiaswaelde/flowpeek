import type { ProviderAccount, WorkflowRun } from '../../../generated/prisma/client.js';
import { ProviderAccountDto, WorkflowRunDto } from './resource.dto.js';

describe('resource DTO mappings', () => {
  it('never serializes encrypted provider access tokens', () => {
    const dto = ProviderAccountDto.fromModel({
      id: 'account',
      providerType: 'GITHUB',
      displayName: 'GitHub',
      baseUrl: null,
      encryptedAccessToken: 'secret',
      enabled: true,
      lastSyncAt: null,
      lastSyncError: 'private detail',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ProviderAccount);

    expect(dto).toEqual({
      id: 'account',
      providerType: 'GITHUB',
      displayName: 'GitHub',
      baseUrl: null,
      enabled: true,
      lastSyncAt: null,
    });
  });

  it('excludes raw provider statuses from public workflow runs', () => {
    const dto = WorkflowRunDto.fromModel({
      id: 'run',
      providerRunId: '1',
      workflowName: 'Build',
      url: 'https://example.test/run',
      providerCreatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      durationMs: null,
      status: 'RUNNING',
      rawStatus: 'in_progress',
      repositoryId: 'repo',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WorkflowRun);

    expect(dto).not.toHaveProperty('rawStatus');
    expect(dto.status).toBe('RUNNING');
  });
});
