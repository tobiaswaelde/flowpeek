# Deploying Flowpeek

Flowpeek's Compose stack starts PostgreSQL, applies Prisma migrations once, and then starts the API and web
applications. It does not terminate TLS. Put the web and API services behind a reverse proxy that owns the public
hostname and certificates.

## Prerequisites

- Docker Engine with Docker Compose v2.
- A DNS record for the public hostname.
- A reverse proxy that obtains and renews TLS certificates.
- A private server directory readable only by deployment administrators.

The Compose stack persists PostgreSQL data in its named `flowpeek-postgres` volume. Do not delete this volume unless
you intentionally want to remove all Flowpeek data.

## First deployment

1. Check out a released Flowpeek version and create the private environment file:

   ```bash
   cp .env.example .env
   chmod 600 .env
   ```

2. Replace every placeholder in `.env`, especially `POSTGRES_PASSWORD`, both database URLs, `AUTH_JWT_SECRET`,
   `INITIAL_ADMIN_PASSWORD`, and `TOKEN_ENCRYPTION_KEY`. Generate the encryption key with:

   ```bash
   openssl rand -base64 32
   ```

3. Set the externally visible URLs. For a deployment at `https://flowpeek.example.com`, use:

   ```dotenv
   PUBLIC_URL=https://flowpeek.example.com
   CORS_ORIGIN=https://flowpeek.example.com
   NUXT_PUBLIC_API_BASE_URL=https://flowpeek.example.com/api/v1
   OAUTH_CALLBACK_URL=https://flowpeek.example.com/api/v1/provider-accounts/oauth/callback
   ```

4. Bind the container ports to loopback when the reverse proxy runs on the same host:

   ```dotenv
   FLOWPEEK_API_PORT=127.0.0.1:3001
   FLOWPEEK_WEB_PORT=127.0.0.1:3000
   ```

   Otherwise, restrict access to ports 3000 and 3001 with the host firewall. Never expose the PostgreSQL container.

5. Set `FLOWPEEK_VERSION` in `.env` to an exact released image pair, then start the stack:

   ```bash
   docker compose pull
   docker compose up --detach --wait
   ```

   Keep that value in `.env` so every later Compose command uses the same API and web version.

6. Confirm the API health endpoint locally:

   ```bash
   curl --fail http://127.0.0.1:3001/api/health
   ```

## Reverse proxy and TLS

Proxy the public web origin to port 3000 and only the API path to port 3001. For example, a Caddy site block can use:

```caddy
flowpeek.example.com {
  reverse_proxy /api/* 127.0.0.1:3001
  reverse_proxy 127.0.0.1:3000
}
```

The proxy must redirect HTTP to HTTPS, validate upstream connections according to its local policy, and preserve the
public hostname. Configure OAuth providers with the same HTTPS callback URL set in `OAUTH_CALLBACK_URL`.

## Upgrading

1. Create and verify a database backup before changing images.
2. Set `FLOWPEEK_VERSION` to the exact release version in `.env`.
3. Pull and apply the release:

   ```bash
   docker compose pull
   docker compose up --detach --wait
   ```

   The `migrate` service applies pending Prisma migrations before the API starts. Inspect it after every update:

   ```bash
   docker compose logs migrate
   ```

4. Verify the health endpoint and the proxy-served dashboard before considering the update complete.

## Database backup

Run backups from the deployment directory. This writes a PostgreSQL custom-format dump to the host without printing
credentials or putting them in the command line:

```bash
mkdir -p backups
backup_file="backups/flowpeek-$(date +%F-%H%M%S).dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  > "$backup_file"
pg_restore --list "$backup_file"
```

Store encrypted copies off-host and periodically test restores on a separate system.

## Database restore

Restoring replaces current database objects. Take a new backup first and schedule downtime.

```bash
docker compose stop api web
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" --clean --if-exists --no-owner -d "$POSTGRES_DB"' \
  < backups/flowpeek-YYYY-MM-DD-HHMMSS.dump
docker compose up --detach --wait
```

Afterward, check `docker compose logs migrate` and the API health endpoint. Restore a dump made by a compatible
Flowpeek version when rolling back across schema changes.

## Rollback

1. Keep the backup made immediately before the failed upgrade.
2. Set `FLOWPEEK_VERSION` in `.env` to the last known-good image version.
3. Run `docker compose pull` and `docker compose up --detach --wait`.
4. If the newer release migrated the database incompatibly, stop API and web, restore the compatible backup, and then
   start the previous image version again.

Never use `docker compose down --volumes` as an update or rollback command: it removes the named PostgreSQL volume.
