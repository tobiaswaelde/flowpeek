# Flowpeek

Flowpeek is a read-only dashboard for GitHub Actions, GitLab pipelines, Forgejo
Actions, and Gitea Actions. It tracks selected workflow runs, shows failures and trends,
and sends notifications without modifying provider resources.

## Status

The repository currently contains the monorepo bootstrap. API and web
implementation are tracked in [GitHub Issues](https://github.com/tobiaswaelde/flowpeek/issues).

## Prerequisites

- Node.js 24.18.0, managed through [nvm](https://github.com/nvm-sh/nvm) or an
  equivalent Node version manager.
- Corepack-enabled pnpm 11.15.1.
- Docker and Docker Compose for the future local PostgreSQL and application
  stack.

## Setup

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm nx show projects
```

Copy `.env.example` to `.env` before using Docker Compose. Never commit `.env`
or provider, database, encryption, JWT, or notification URL credentials.

## Environment configuration

The API loads the root `.env` file before startup and validates its runtime
configuration with `envalid`. It refuses to start when a required value is
missing or violates a listed constraint. For a local setup, begin with:

```bash
cp .env.example .env
```

Replace every placeholder before sharing or deploying an environment. The
template deliberately contains no usable passwords, tokens, or encryption
keys, so the API will reject it until you provide real deployment values. The
API accepts the following variables:

| Variable                          | Required | Default                 | Purpose and constraints                                                                     |
| --------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                        | No       | `development`           | One of `development`, `production`, or `test`.                                              |
| `PORT`                            | No       | `3001`                  | HTTP port as a number.                                                                      |
| `DATABASE_URL`                    | Yes      | —                       | PostgreSQL connection URL used by the API.                                                  |
| `SHADOW_DATABASE_URL`             | Yes      | —                       | PostgreSQL shadow database URL used for Prisma migrations.                                  |
| `CORS_ORIGIN`                     | No       | `http://localhost:3000` | One origin, comma-separated origins, or `*`.                                                |
| `PUBLIC_URL`                      | No       | `http://localhost:3000` | Public Flowpeek URL; must use HTTP or HTTPS.                                                |
| `AUTH_JWT_ISSUER`                 | No       | `flowpeek`              | JWT issuer identifier.                                                                      |
| `AUTH_JWT_SECRET`                 | Yes      | —                       | Long, unique secret used to sign JWTs.                                                      |
| `AUTH_JWT_EXPIRATION`             | No       | `7d`                    | JWT lifetime accepted by the Nest JWT module.                                               |
| `INITIAL_ADMIN_USERNAME`          | No       | `admin`                 | Username created on the initial empty database.                                             |
| `INITIAL_ADMIN_PASSWORD`          | Yes      | —                       | Password for the initial administrator; use a strong unique value.                          |
| `TOKEN_ENCRYPTION_KEY`            | Yes      | —                       | Canonical Base64 value decoding to exactly 32 bytes; encrypts provider and webhook secrets. |
| `SCHEDULER_ENABLED`               | No       | `true`                  | Enables scheduled polling and retention jobs. Set `false` for one-off commands.             |
| `SCHEDULER_SYNC_INTERVAL_SECONDS` | No       | `300`                   | Positive integer polling interval in seconds.                                               |

`FLOWPEEK_ENV_FILE` is an optional local loader setting. When set, the API
loads that file after the root `.env` file, allowing a local override without
changing the shared template.

The following variables are used by the Docker Compose deployment rather than
by the Nest API's `envalid` configuration:

| Variable            | Default    | Purpose                                               |
| ------------------- | ---------- | ----------------------------------------------------- |
| `POSTGRES_DB`       | `flowpeek` | PostgreSQL database name.                             |
| `POSTGRES_USER`     | `flowpeek` | PostgreSQL user.                                      |
| `POSTGRES_PASSWORD` | —          | PostgreSQL password; replace the example value.       |
| `FLOWPEEK_VERSION`  | `latest`   | API and web image version selected by Docker Compose. |

Provider access tokens, provider webhook secrets, and notification credentials
are not environment variables. Flowpeek stores them encrypted in PostgreSQL
through its application configuration. See [notification configuration](docs/notifications.md) for Apprise URL handling and migration guidance.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm changeset status
```

The API and web targets are intentionally introduced before their application
implementations so CI and local commands have stable names from the start.

## Changesets and releases

Flowpeek uses one private root package and Changesets for release management.
Add exactly one focused Changeset for every substantive implementation commit:

```bash
pnpm changeset
```

The GitHub deployment workflow will create or update a release pull request.
After that pull request is merged, it creates the release tag and publishes
matching API and web Docker images to GitHub Container Registry.

## Dependency updates

Dependabot checks the root pnpm workspace, both application manifests, and the
GitHub Actions workflows every Monday. Routine version updates are grouped by
production or development scope; security updates remain separate for focused
review. TypeScript is intentionally excluded because every workspace manifest
pins the validated compiler version `6.0.3` exactly.

Review each update against its lockfile changes and run the affected checks. At
minimum, run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`,
and `pnpm test`; run application-specific build or Docker checks when a runtime
dependency or build tooling changes. Add exactly one focused Changeset when a
dependency update changes released runtime behavior. Lockfile-only, tooling,
and GitHub Actions updates do not need a Changeset.

## Security scanning

CodeQL analyzes JavaScript/TypeScript and GitHub Actions workflow files for pull
requests targeting `main`, pushes to `main`, and every Monday. Those languages
are analyzed directly from source, so no Node, pnpm, or application build is
needed in the CodeQL workflow. The workflow uses `pull_request`, never
`pull_request_target`; GitHub therefore downgrades the token for fork pull
requests and does not expose repository secrets.

Review CodeQL results in the repository Security view. Fix verified findings
promptly; dismiss a false positive or accepted risk only with a concise,
auditable justification in GitHub.

## Architecture

- `apps/api`: NestJS, Prisma, PostgreSQL, CASL, and `@querry-kit/nest`.
- `apps/web`: Nuxt 4 SPA, Pinia, Nuxt UI, and `@querry-kit/nuxt`.
- `docs/deployment.md`: production deployment, TLS proxy, backup, restore, and rollback procedures.
- `PLAN.md`: approved architecture and release design.
- `docs/provider-webhooks.md`: manual read-only webhook setup for each provider.
- `docs/localization.md`: supported interface locales, fallback behavior, and translation process.
- [GitHub Issues](https://github.com/tobiaswaelde/flowpeek/issues): ordered
  implementation epics and tasks.
- `AGENTS.md`: repository-specific instructions for coding agents.
