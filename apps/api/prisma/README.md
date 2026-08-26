# Flowpeek Prisma Schema

Prisma loads every `.prisma` file in this directory through `prisma.config.ts`.
Keep the generator and PostgreSQL datasource in `schema.prisma`; place each
domain's models and enums in its matching file.

Every persisted Flowpeek resource uses a UUID primary key named `id`. Models
that represent mutable resources also include `createdAt` and `updatedAt` UTC
timestamps. Provider run timestamps remain explicit so the source event time is
not confused with Flowpeek's record timestamps.

| File                       | Responsibility                                          |
| -------------------------- | ------------------------------------------------------- |
| `auth.prisma`              | Users, roles, and authentication data                   |
| `provider-accounts.prisma` | Read-only provider accounts and credentials             |
| `repositories.prisma`      | Tracked repositories, memberships, and workflow filters |
| `workflow-runs.prisma`     | Normalized provider workflow-run history                |
| `notifications.prisma`     | Channels, rules, deliveries, and attempts               |
| `webhooks.prisma`          | Webhook configuration and idempotency records           |
| `settings.prisma`          | Global and repository-scoped settings                   |
| `sync.prisma`              | Synchronization health and execution metadata           |

Never edit `src/generated/prisma`; regenerate it through `pnpm db:generate`
after changing this schema.
