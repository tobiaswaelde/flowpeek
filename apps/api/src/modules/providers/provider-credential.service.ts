import { Injectable } from '@nestjs/common';

import { CredentialEncryptionService } from '../../security/credential-encryption.service.js';

/** Encrypts provider credentials at rest using Flowpeek's shared credential service. */
@Injectable()
export class ProviderCredentialService {
  constructor(private readonly credentials: CredentialEncryptionService) {}

  /** Encrypt a provider credential without retaining or logging its plaintext. */
  encrypt(plaintext: string): string {
    return this.credentials.encrypt(plaintext);
  }

  /** Decrypt a credential stored by {@link encrypt}. */
  decrypt(encrypted: string): string {
    return this.credentials.decrypt(encrypted);
  }
}
