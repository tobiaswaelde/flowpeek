import { ProviderCredentialService } from './provider-credential.service.js';

describe('ProviderCredentialService', () => {
  const service = new ProviderCredentialService();
  it('round-trips credentials without keeping plaintext in ciphertext', () => {
    const encrypted = service.encrypt('provider-secret');
    expect(encrypted).not.toContain('provider-secret');
    expect(service.decrypt(encrypted)).toBe('provider-secret');
  });
  it('rejects malformed encrypted credentials', () => {
    expect(() => service.decrypt('invalid')).toThrow('Invalid encrypted provider credential.');
  });
});
