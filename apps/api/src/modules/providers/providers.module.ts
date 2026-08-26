import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { ForgejoActionsAdapter } from './forgejo/forgejo-actions.adapter.js';
import { GitHubActionsAdapter } from './github/github-actions.adapter.js';
import { GitLabPipelinesAdapter } from './gitlab/gitlab-pipelines.adapter.js';
import { ProviderAccountsController } from './provider-accounts.controller.js';
import { ProviderAccountsService } from './provider-accounts.service.js';
import { PROVIDER_FETCH } from './provider-adapter.js';
import { ProviderAdapterRegistry } from './provider-adapter.registry.js';
import { ProviderCredentialService } from './provider-credential.service.js';
import { ProviderSyncService } from './sync.service.js';

@Module({
  imports: [CaslModule, JobsModule, NotificationsModule, RepositoriesModule, SecurityModule],
  controllers: [ProviderAccountsController],
  providers: [
    {
      provide: PROVIDER_FETCH,
      useValue: fetch,
    },
    ProviderAccountsService,
    ProviderCredentialService,
    GitHubActionsAdapter,
    GitLabPipelinesAdapter,
    ForgejoActionsAdapter,
    {
      provide: ProviderAdapterRegistry,
      useFactory: (github: GitHubActionsAdapter, gitlab: GitLabPipelinesAdapter, forgejo: ForgejoActionsAdapter) =>
        new ProviderAdapterRegistry([github, gitlab, forgejo]),
      inject: [GitHubActionsAdapter, GitLabPipelinesAdapter, ForgejoActionsAdapter],
    },
    ProviderSyncService,
  ],
  exports: [ProviderCredentialService, ProviderAdapterRegistry, ProviderSyncService],
})
export class ProvidersModule {}
