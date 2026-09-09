import { Fields, buildFieldSchemaFromDto } from '@querry-kit/nest';
import type { ProviderAccount, Repository } from '../../../generated/prisma/client.js';
import { ProviderAccountDto, RepositoryDto, WorkflowRunDto, type WorkflowRunResourceModel } from './resource.dto.js';

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

  it('allows Query Kit to project every provider-table field', () => {
    const schema = buildFieldSchemaFromDto(ProviderAccountDto);

    expect(schema).toEqual({
      baseUrl: true,
      displayName: true,
      enabled: true,
      id: true,
      lastSyncAt: true,
      providerType: true,
    });
    expect(Fields.parseAndValidate('id,displayName,providerType,baseUrl,enabled,lastSyncAt', schema)).toEqual(schema);
  });

  it('allows Query Kit to project every repository-table field', () => {
    const schema = buildFieldSchemaFromDto(RepositoryDto);

    expect(
      Fields.parseAndValidate('id,name,owner,enabled,url,workflowRunCount,workflowRunRetentionDays,lastSyncAt', schema),
    ).toEqual({
      enabled: true,
      id: true,
      lastSyncAt: true,
      name: true,
      owner: true,
      url: true,
      workflowRunCount: true,
      workflowRunRetentionDays: true,
    });
  });

  it('maps the repository fields shown in the administration table', () => {
    const dto = RepositoryDto.fromModel({
      id: 'repository',
      providerRepositoryId: '42',
      owner: 'flowpeek',
      name: 'flowpeek',
      url: 'https://example.test/flowpeek',
      enabled: true,
      lastSyncAt: null,
      workflowRunRetentionDays: 30,
      providerAccountId: 'account',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { workflowRuns: 12 },
    } as Repository);

    expect(dto).toEqual({
      id: 'repository',
      providerRepositoryId: '42',
      owner: 'flowpeek',
      name: 'flowpeek',
      url: 'https://example.test/flowpeek',
      enabled: true,
      lastSyncAt: null,
      workflowRunRetentionDays: 30,
      providerAccountId: 'account',
      workflowRunCount: 12,
    });
  });

  it('allows Query Kit to project every workflow-run table field', () => {
    const schema = buildFieldSchemaFromDto(WorkflowRunDto);

    expect(
      Fields.parseAndValidate(
        'id,url,workflowName,displayTitle,status,completedAt,durationMs,repositoryName,repositoryOwner,providerType',
        schema,
      ),
    ).toEqual({
      completedAt: true,
      durationMs: true,
      displayTitle: true,
      id: true,
      providerType: true,
      repositoryName: true,
      repositoryOwner: true,
      status: true,
      url: true,
      workflowName: true,
    });
  });

  it('excludes raw provider statuses from public workflow runs', () => {
    const dto = WorkflowRunDto.fromModel({
      id: 'run',
      providerRunId: '1',
      workflowName: 'Build',
      displayTitle: 'Build on main',
      url: 'https://example.test/run',
      providerCreatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      durationMs: null,
      status: 'RUNNING',
      rawStatus: 'in_progress',
      repositoryId: 'repo',
      repository: {
        name: 'flowpeek',
        owner: 'twaelde',
        providerAccount: { providerType: 'GITHUB' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WorkflowRunResourceModel);

    expect(dto).not.toHaveProperty('rawStatus');
    expect(dto.status).toBe('RUNNING');
    expect(dto).toMatchObject({
      displayTitle: 'Build on main',
      providerType: 'GITHUB',
      repositoryName: 'flowpeek',
      repositoryOwner: 'twaelde',
    });
  });
});
