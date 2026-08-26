import { describe, expect, it } from 'vitest';

import { signInRequestSchema, updatePasswordRequestSchema } from './auth';
import { apiEndpoints } from './endpoints';

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
});
