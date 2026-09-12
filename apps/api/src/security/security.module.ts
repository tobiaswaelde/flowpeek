import { Module } from '@nestjs/common';

import { CredentialEncryptionService } from './credential-encryption.service.js';

/** Provides reusable encryption for secrets stored by ezRepo. */
@Module({
  providers: [CredentialEncryptionService],
  exports: [CredentialEncryptionService],
})
export class SecurityModule {}
