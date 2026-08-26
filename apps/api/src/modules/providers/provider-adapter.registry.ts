import { Injectable } from '@nestjs/common';

import type { ProviderType } from '../../generated/prisma/client.js';
import type { ProviderAdapter } from './provider-adapter.js';

/** Resolves the installed read-only adapter for a provider type. */
@Injectable()
export class ProviderAdapterRegistry {
  constructor(private readonly adapters: ProviderAdapter[]) {}
  get(providerType: ProviderType): ProviderAdapter {
    const adapter = this.adapters.find((candidate) => candidate.providerType === providerType);
    if (!adapter) throw new Error(`No adapter is installed for ${providerType}.`);
    return adapter;
  }
}
