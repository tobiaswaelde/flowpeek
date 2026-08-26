# Flowpeek

Flowpeek is a read-only dashboard for GitHub Actions, GitLab pipelines, and
Forgejo Actions. It tracks selected workflow runs, shows failures and trends,
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
or provider, database, encryption, JWT, SMTP, Gotify, or ntfy credentials.

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

## Architecture

- `apps/api`: NestJS, Prisma, PostgreSQL, CASL, and `@querry-kit/nest`.
- `apps/web`: Nuxt 4 SPA, Pinia, Nuxt UI, and `@querry-kit/nuxt`.
- `PLAN.md`: approved architecture and release design.
- `docs/provider-webhooks.md`: manual read-only webhook setup for each provider.
- [GitHub Issues](https://github.com/tobiaswaelde/flowpeek/issues): ordered
  implementation epics and tasks.
- `AGENTS.md`: repository-specific instructions for coding agents.
