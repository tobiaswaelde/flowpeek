import { BadRequestException } from '@nestjs/common';

import { ProviderOAuthStateService } from './provider-oauth-state.service.js';

describe('ProviderOAuthStateService', () => {
  const credentials = {
    decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
  };
  const service = new ProviderOAuthStateService(credentials as never);

  beforeEach(() => jest.clearAllMocks());

  it('encrypts and restores a short-lived OAuth authorization context', () => {
    const state = service.create({
      displayName: 'GitHub',
      providerType: 'GITHUB',
      userId: 'admin-id',
    });

    expect(state).toContain('encrypted:');
    expect(service.consume(state)).toEqual(
      expect.objectContaining({ displayName: 'GitHub', providerType: 'GITHUB', userId: 'admin-id' }),
    );
  });

  it('rejects altered authorization state', () => {
    expect(() => service.consume('not-a-valid-state')).toThrow(BadRequestException);
  });
});
