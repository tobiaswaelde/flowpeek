import type { ProviderAccount, Repository, WorkflowRun } from '../../../generated/prisma/client.js';
import { DashboardWorkflowRunDto } from './dashboard-workflow-run.dto.js';

describe('DashboardWorkflowRunDto', () => {
  it('includes workflow, repository, and provider display context without credentials', () => {
    const dto = DashboardWorkflowRunDto.fromModel({
      completedAt: new Date('2026-08-26T10:01:00.000Z'),
      createdAt: new Date('2026-08-26T10:00:00.000Z'),
      durationMs: 60_000,
      id: 'run-id',
      providerCreatedAt: new Date('2026-08-26T10:00:00.000Z'),
      providerRunId: 'provider-run-id',
      rawStatus: 'failure',
      repository: {
        id: 'repository-id',
        name: 'flowpeek',
        owner: 'flowpeek',
        providerAccount: {
          displayName: 'Flowpeek GitHub',
          encryptedAccessToken: 'must-not-appear',
          encryptedWebhookSecret: 'must-not-appear',
          id: 'provider-id',
          providerType: 'GITHUB',
        } as ProviderAccount,
        url: 'https://github.com/flowpeek/flowpeek',
      } as unknown as Repository,
      repositoryId: 'repository-id',
      startedAt: new Date('2026-08-26T10:00:00.000Z'),
      status: 'FAILED',
      updatedAt: new Date('2026-08-26T10:01:00.000Z'),
      url: 'https://github.com/flowpeek/flowpeek/actions/runs/1',
      workflowName: 'Test',
    } as WorkflowRun & { repository: Repository & { providerAccount: ProviderAccount } });

    expect(dto).toEqual({
      completedAt: new Date('2026-08-26T10:01:00.000Z'),
      durationMs: 60_000,
      id: 'run-id',
      provider: { displayName: 'Flowpeek GitHub', id: 'provider-id', providerType: 'GITHUB' },
      providerCreatedAt: new Date('2026-08-26T10:00:00.000Z'),
      providerRunId: 'provider-run-id',
      repository: {
        id: 'repository-id',
        name: 'flowpeek',
        owner: 'flowpeek',
        url: 'https://github.com/flowpeek/flowpeek',
      },
      startedAt: new Date('2026-08-26T10:00:00.000Z'),
      status: 'FAILED',
      url: 'https://github.com/flowpeek/flowpeek/actions/runs/1',
      workflowName: 'Test',
    });
    expect(dto).not.toHaveProperty('provider.encryptedAccessToken');
    expect(dto).not.toHaveProperty('provider.encryptedWebhookSecret');
  });
});
