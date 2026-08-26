import { Module } from '@nestjs/common';

import { ProviderCredentialService } from './provider-credential.service.js';

@Module({ providers: [ProviderCredentialService], exports: [ProviderCredentialService] })
export class ProvidersModule {}
