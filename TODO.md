# Flowpeek Implementation Checklist

This checklist implements the approved plan in `PLAN.md`. Complete the items
in order unless a dependency is explicitly marked as parallelizable.

## 1. Bootstrap the Monorepo

- [x] Rename the root package to `flowpeek`, set an initial `0.1.0` version,
      and configure it as the single private Changesets release package.
- [x] Create a pnpm workspace with `apps/api` and `apps/web`.
- [x] Add Nx project definitions and root targets for linting, typechecking,
      testing, building, database generation, and Docker builds.
- [x] Pin `typescript` to exactly `6.0.3` in the workspace and ensure both
      applications resolve that version. Revisit TypeScript 7 when the lint
      and import-organization tooling supports its compiler API.
- [x] Add shared Prettier and ESLint configuration matching the Machine Admin
      conventions: single quotes, semicolons, trailing commas, and a
      120-character print width.
- [x] Add `.editorconfig`, `.gitignore`, `.env.example`, Node 24 and pnpm
      version metadata, and a root README with local-development prerequisites.
- [x] Configure Changesets for one versioned private package and document how
      feature changes receive a Changeset.

## 2. Create the API Foundation

- [ ] Scaffold `apps/api` as a NestJS application with URI versioning,
      `/api/v1` as the default API prefix, `/docs` for Swagger/Scalar, and
      `/api/health` for health checks.
- [ ] Add validated environment configuration for database access, CORS,
      JWT, bootstrap-admin credentials, token-encryption key, scheduler
      settings, SMTP, and public Flowpeek URL.
- [ ] Configure Prisma 7 for PostgreSQL with generated client output under the
      API source tree and migration commands suitable for local development,
      CI, and Docker deployment.
- [ ] Create a split Prisma schema covering shared timestamps/IDs and the
      domains listed below.
- [ ] Add a Prisma module/service, transaction support, database-exception
      mapping, test-database configuration, and deterministic test cleanup.
- [ ] Add global validation, serialization, error-response, CORS, rate-limit,
      and API-documentation configuration.
- [ ] Add Nest Scheduler and an application-level job abstraction that can be
      disabled for tests and controlled through environment configuration.

## 3. Implement Authentication and Authorization

- [ ] Implement local username/password sign-in, JWT issuance, current-user
      lookup, sign-out, and password updates.
- [ ] Implement the idempotent initial-admin bootstrap from environment
      variables; never overwrite an existing administrator.
- [ ] Create `User` with `SYSTEM_ADMIN`, `VIEWER`, and `MANAGER` roles.
- [ ] Create repository memberships assigning `VIEWER` or `MANAGER` access to
      individual tracked repositories.
- [ ] Add CASL subjects for users, provider accounts, repositories, workflow
      runs, notification resources, and settings.
- [ ] Build abilities so system administrators have all rights, viewers have
      read-only rights only for assigned repositories, and managers can update
      configuration only for assigned repositories.
- [ ] Apply JWT and policy guards to every protected endpoint.
- [ ] Verify access restrictions in database queries through CASL-aware
      `QueryService` configuration; do not rely on hiding fields in DTOs.

## 4. Define the Workflow Data Model

- [ ] Add `ProviderAccount` with provider type (`GITHUB`, `GITLAB`,
      `FORGEJO`), display name, optional base URL, encrypted access token,
      enabled state, and sync health metadata.
- [ ] Add provider repository discovery data and a `Repository` model for
      selected tracked repositories, including provider-native ID, owner/name,
      URL, enabled state, and last-sync information.
- [ ] Add repository workflow filters with glob pattern and allow/deny mode;
      validate patterns and evaluate deny patterns before allow patterns.
- [ ] Add `WorkflowRun` with provider-native run ID, repository relation,
      workflow/pipeline name, URL, creation/start/completion timestamps,
      nullable duration, status, and the fields needed for idempotent updates.
- [ ] Add global settings and optional repository retention override; define a
      scheduler task that deletes only runs older than the effective policy.
- [ ] Add indexes for provider-run uniqueness, repository/time queries,
      dashboard status queries, retention cleanup, and notification lookup.
- [ ] Create DTOs, endpoint type maps, Query Kit type maps, and explicit
      ability-aware `fromModel` mapping for every exposed resource.

## 5. Implement Provider Adapters and Synchronization

- [ ] Define a provider-adapter interface for account validation, repository
      listing, workflow-run listing, run lookup, and webhook verification.
- [ ] Implement GitHub Actions read-only adapter support for repositories and
      workflow runs.
- [ ] Implement GitLab read-only adapter support for projects and pipelines;
      map pipelines to the common workflow-run model.
- [ ] Implement Forgejo read-only adapter support for repositories and Actions
      workflow runs, with clear capability errors for unsupported Forgejo
      server versions.
- [ ] Normalize provider states to `queued`, `running`, `success`, `failed`,
      `cancelled`, `skipped`, or `unknown` without losing the raw provider
      status for diagnostics.
- [ ] Encrypt and decrypt provider credentials through one dedicated service;
      redact credentials from logs, errors, DTOs, and test snapshots.
- [ ] Implement scheduled incremental synchronization for enabled tracked
      repositories, rate-limit handling, bounded retries, and per-account
      failure reporting.
- [ ] Upsert runs by provider account, repository, and provider-native run ID
      so polling and webhooks cannot create duplicates.
- [ ] Add authenticated webhook endpoints for each provider with independent
      signing secrets, request verification, idempotency handling, and
      asynchronous targeted synchronization.
- [ ] Document manual provider webhook setup. Do not implement provider API
      calls that create, edit, delete, start, stop, or rerun anything.

## 6. Implement Dashboard and Run APIs

- [ ] Add paginated, searchable, filterable, and sortable run endpoints using
      `@querry-kit/nest` resource queries.
- [ ] Add a dashboard summary endpoint returning the latest failed terminal
      run for each visible workflow/repository.
- [ ] Add a latest-runs endpoint limited to the ten newest visible runs.
- [ ] Add a trend endpoint that aggregates visible completed runs into time
      buckets and returns success/error counts for a requested range.
- [ ] Make every dashboard query membership-aware and test that aggregated
      results cannot reveal inaccessible repository activity.
- [ ] Include links, names, provider identity, status, duration, and relevant
      timestamps in the dashboard DTOs.

## 7. Implement Notifications

- [ ] Add repository-scoped notification channels for email, Gotify, and ntfy.
- [ ] Store email recipients as channel configuration and use globally
      configured SMTP transport settings; encrypt Gotify and ntfy secrets.
- [ ] Add notification rules selecting repository, workflow-name glob, result
      (`failed` or `success`), enabled state, and one or more channels.
- [ ] Evaluate matching rules after a terminal run is inserted or updated.
- [ ] Create one idempotent delivery record per rule and run.
- [ ] Implement channel adapters with structured payloads containing provider,
      repository, workflow name, status, duration, timestamp, and run URL.
- [ ] Retry failed deliveries using bounded exponential backoff; record each
      attempt, final error, and final delivery state.
- [ ] Expose delivery history only to system administrators and repository
      managers with access to the related repository.

## 8. Create the Nuxt Dashboard

- [ ] Scaffold `apps/web` as a Nuxt 4 SPA with the Machine Admin directory
      layout, Nuxt UI, Pinia, i18n, dark-mode default, and TypeScript 7.
- [ ] Add runtime configuration for the API base URL and a typed Axios API
      client that sends JWT bearer authentication and browser timezone headers.
- [ ] Implement Pinia auth state, token persistence, current-user refresh,
      sign-in/sign-out behavior, and global route/layout middleware.
- [ ] Define frontend DTOs, Zod schemas where needed, endpoint mappings, and
      typed `useModuleApi` wrappers matching every API resource.
- [ ] Add Query Kit `useTable` integration and retain full column metadata
      when adapting columns to the local table controls.
- [ ] Create the sign-in view and authenticated default application layout.
- [ ] Create the dashboard page with failed-workflow cards, latest-runs table,
      provider links, status badges, duration formatting, empty states, and a
      selectable success/error trend chart.
- [ ] Create provider-account administration screens for system administrators.
- [ ] Create repository screens for discovery, tracking selection, workflow
      filters, retention override, and user membership assignment.
- [ ] Create channel, notification-rule, and delivery-history screens with
      visibility and actions limited by the active user ability.
- [ ] Create user-management screens for system administrators.
- [ ] Add English and German translations for every user-visible string.

## 9. Add Docker Deployment

- [ ] Add production Dockerfiles for API and web using Node 24 and frozen pnpm
      installs.
- [ ] Ensure the API image includes generated Prisma client code and can run
      production migrations without development dependencies.
- [ ] Create `compose.yml` with PostgreSQL, a one-shot migration service, API,
      and web services.
- [ ] Use named PostgreSQL volumes and environment-file examples without real
      tokens, passwords, SMTP credentials, or encryption keys.
- [ ] Wire `FLOWPEEK_VERSION` into API and web image references so Compose
      deploys a matched release pair.
- [ ] Document reverse-proxy/TLS expectations, first deployment, upgrades,
      database backup, restore, and rollback procedures.

## 10. Add GitHub Actions and Changesets Releases

- [ ] Add `lint.yml` for pull requests and `main` pushes with checkout,
      Node 24, Corepack, frozen install, API lint, web lint, API typecheck,
      and Nuxt typecheck.
- [ ] Add `test.yml` for pull requests and `main` pushes with PostgreSQL,
      Prisma generation/migrations, API Jest tests, and web tests.
- [ ] Add `deploy.yml` for `main` pushes and manual dispatch using
      `changesets/action`.
- [ ] Configure the deploy workflow to create or update a Changesets release
      pull request when unreleased Changesets exist.
- [ ] Configure the deploy workflow to tag the single `flowpeek` application,
      create its GitHub release, and publish API and web images to GHCR only
      after the release pull request is merged.
- [ ] Publish exact SemVer and `latest` tags to
      `ghcr.io/<owner>/flowpeek-api` and `ghcr.io/<owner>/flowpeek-web`.
- [ ] Grant deploy only `contents: write`, `pull-requests: write`, and
      `packages: write`; keep lint and test workflows read-only.
- [ ] Add a release smoke check that validates the produced Compose image tags
      and starts the stack far enough to pass API health checks.

## 11. Validate the Complete System

- [ ] Add unit tests for status normalization, filter precedence, retention
      resolution, credential encryption, rule matching, deduplication, and
      notification retry timing.
- [ ] Add fixture-based adapter and webhook tests for GitHub, GitLab, and
      Forgejo payloads.
- [ ] Add API integration tests covering all role/repository combinations and
      prove inaccessible data does not appear in lists, details, or charts.
- [ ] Add frontend tests for sign-in redirects, permission-gated navigation,
      loading/empty/error states, dashboard values, and table filters.
- [ ] Run the full uncached Nx lint, typecheck, test, build, and Compose smoke
      suite before considering the first release ready.
