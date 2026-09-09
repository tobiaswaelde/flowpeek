import { describe, expect, it } from 'vitest';

import { signInRequestSchema, updatePasswordRequestSchema } from './auth';
import { apiEndpoints } from './endpoints';
import { applicationSettingsSchema, providerOAuthFormSchema, providerPatFormSchema } from './resources';

describe('web API contracts', () => {
  it('validates local credential payloads before they are submitted', () => {
    expect(signInRequestSchema.safeParse({ password: 'secret', username: 'admin' }).success).toBe(true);
    expect(updatePasswordRequestSchema.safeParse({ currentPassword: 'secret', newPassword: 'short' }).success).toBe(
      false,
    );
  });

  it('keeps the Query Kit endpoint relative to the configured API version', () => {
    expect(apiEndpoints.workflowRuns).toBe('workflow-runs');
    expect(apiEndpoints.settings).toEqual({ base: '/settings', preferences: '/settings/preferences' });
  });

  it('validates the complete global settings payload', () => {
    expect(applicationSettingsSchema.safeParse({ dateTimeFormat: 'ISO', workflowRunRetentionDays: 3650 }).success).toBe(
      true,
    );
    expect(applicationSettingsSchema.safeParse({ dateTimeFormat: 'CUSTOM', workflowRunRetentionDays: 0 }).success).toBe(
      false,
    );
  });

  it('requires a personal access token only for PAT provider forms', () => {
    expect(
      providerOAuthFormSchema.safeParse({
        baseUrl: 'https://github.example.test',
        displayName: 'GitHub',
        providerType: 'GITHUB',
      }).success,
    ).toBe(true);
    expect(providerPatFormSchema.safeParse({ displayName: 'GitHub', providerType: 'GITHUB' }).success).toBe(false);
  });

  it('requires a base URL when a Gitea personal access token is configured', () => {
    expect(
      providerPatFormSchema.safeParse({ accessToken: 'token', displayName: 'Gitea', providerType: 'GITEA' }).success,
    ).toBe(false);
    expect(
      providerPatFormSchema.safeParse({
        accessToken: 'token',
        baseUrl: 'https://gitea.example.test',
        displayName: 'Gitea',
        providerType: 'GITEA',
      }).success,
    ).toBe(true);
  });
});
