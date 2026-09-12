import { describe, expect, it } from 'vitest';

import { createApiClient } from './api';

describe('createApiClient', () => {
  it('uses the configured API base URL', () => {
    const client = createApiClient('https://ezrepo.example.test/api/v1', 'access-token');

    expect(client.defaults.baseURL).toBe('https://ezrepo.example.test/api/v1');
  });
});
