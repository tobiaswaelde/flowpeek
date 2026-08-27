import { describe, expect, it } from 'vitest';

import { signInRequestSchema, updatePasswordRequestSchema } from './auth';
import { apiEndpoints } from './endpoints';
import { providerOAuthFormSchema, providerPatFormSchema } from './resources';

describe('web API contracts', () => {
  it('validates local credential payloads before they are submitted', () => {
    expect(signInRequestSchema.safeParse({ password: 'secret', username: 'admin' }).success).toBe(true);
    expect(updatePasswordRequestSchema.safeParse({ currentPassword: 'secret', newPassword: 'short' }).success).toBe(
      false,
    );
  });

  it('keeps the Query Kit endpoint relative to the configured API version', () => {
    expect(apiEndpoints.workflowRuns).toBe('workflow-runs');
  });

  it('requires a personal access token only for PAT provider forms', () => {
    expect(providerOAuthFormSchema.safeParse({ displayName: 'GitHub', providerType: 'GITHUB' }).success).toBe(true);
    expect(providerPatFormSchema.safeParse({ displayName: 'GitHub', providerType: 'GITHUB' }).success).toBe(false);
  });
});
