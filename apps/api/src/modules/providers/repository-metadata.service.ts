import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ProviderAccount, Repository } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { ProviderAdapterRegistry } from './provider-adapter.registry.js';
import { ProviderCredentialService } from './provider-credential.service.js';

type RepositoryWithProviderAccount = Repository & {
  providerAccount: Pick<ProviderAccount, 'baseUrl' | 'encryptedAccessToken' | 'id' | 'providerType'>;
};

/** Refreshes locally persisted repository metadata through read-only provider APIs. */
@Injectable()
export class RepositoryMetadataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: ProviderAdapterRegistry,
    private readonly credentials: ProviderCredentialService,
  ) {}

  /** Refresh one repository selected by a system administrator. */
  async refreshById(user: AuthenticatedUser, repositoryId: string): Promise<Repository> {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { providerAccount: true },
    });
    if (!repository) throw new NotFoundException('Repository not found.');
    if (!repository.providerAccount.enabled) throw new BadRequestException('Provider account is disabled.');
    return this.refresh(repository);
  }

  /** Resolve and persist the current provider-owned name, namespace, and URL. */
  async refresh<T extends RepositoryWithProviderAccount>(repository: T): Promise<T> {
    const adapter = this.adapters.get(repository.providerAccount.providerType);
    const metadata = await adapter.getRepository(
      {
        accessToken: this.credentials.decrypt(repository.providerAccount.encryptedAccessToken),
        baseUrl: repository.providerAccount.baseUrl,
        providerAccountId: repository.providerAccount.id,
      },
      repository,
    );
    if (!metadata) throw new NotFoundException('Provider repository not found.');
    if (metadata.providerRepositoryId !== repository.providerRepositoryId)
      throw new ConflictException('Provider repository identity does not match the tracked repository.');

    if (metadata.name === repository.name && metadata.owner === repository.owner && metadata.url === repository.url)
      return repository;

    await this.prisma.repository.update({
      where: { id: repository.id },
      data: { name: metadata.name, owner: metadata.owner, url: metadata.url },
    });
    return { ...repository, name: metadata.name, owner: metadata.owner, url: metadata.url };
  }
}
