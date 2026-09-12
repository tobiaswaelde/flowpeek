---
title: Authentication
description: Complete first-run setup, sign in, change a password, and recover local account access.
---

# Authentication

## First-run setup

After deploying a new installation, open its public URL. ezRepo redirects every request to `/auth/setup` until the
first account exists. Enter an optional first and last name, a unique username, and a password with at least 12
characters. The account is created as the system administrator and signed in immediately.

Setup can succeed only once. After the first user exists, `/auth/setup` redirects to `/auth/signin`. Existing
installations keep their current users during upgrades and do not show setup again.

## Change your password

While signed in, open **Settings → General → Change password**. Enter the current password, the new password, and its
confirmation. ezRepo keeps the current browser signed in with a replacement access token and invalidates tokens held
by every other signed-in session.

## Reset a forgotten password

ezRepo deliberately has no email-based password reset. A deployment administrator can reset a local account from the
directory containing `compose.yml`. Read the replacement password without echoing it or storing it in shell history,
then send it to the API container over standard input:

```bash
read -rsp 'New ezRepo password: ' EZREPO_NEW_PASSWORD
printf '\n'
printf '%s\n' "$EZREPO_NEW_PASSWORD" \
  | docker compose exec -T api node dist/scripts/reset-password.js USERNAME
unset EZREPO_NEW_PASSWORD
```

Replace `USERNAME` with the exact login username. The command requires a password between 12 and 256 characters,
updates only that local account, and invalidates all of its existing access tokens. Sign in again with the new
password afterward.
