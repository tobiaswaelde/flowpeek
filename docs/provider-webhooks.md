# Manual provider webhook setup

Flowpeek can receive signed webhooks to synchronize a tracked repository sooner
than its normal polling interval. It never creates, updates, deletes, or tests
webhooks through GitHub, GitLab, or Forgejo APIs. An administrator configures
each provider webhook manually in the provider UI.

Webhooks are an optimization, not the source of truth. Flowpeek uses the
verified payload only to select a tracked repository, then reads workflow runs
through the configured read-only provider adapter.

## Before creating a provider webhook

1. Create a Flowpeek provider account and record its UUID as
   `<provider-account-id>`.
2. Generate a unique, high-entropy signing secret for that account. Do not
   reuse a provider access token or a secret from another account.
3. Store the exact secret with the provider account as an AES-256-GCM encrypted
   `encryptedWebhookSecret` value. Encryption must happen on the Flowpeek
   server through `ProviderCredentialService`; never write a plaintext secret
   to PostgreSQL or commit it to a configuration file.
4. Expose Flowpeek through a public HTTPS URL. The URL must reach the API,
   including its `/api` prefix, without a proxy rewriting the request body.

The provider-account management UI and API will perform server-side secret
encryption when they are introduced. Until then, deployment provisioning must
set the encrypted account field on the server. Do not use direct SQL with a
plaintext secret.

Each accepted delivery returns HTTP `202` with `{ "accepted": true }`.
Repeated provider delivery IDs return `{ "accepted": true, "duplicate": true }`
and do not start another targeted synchronization. Invalid signatures,
unknown accounts, disabled accounts, missing secrets, or missing delivery IDs
are rejected without exposing account details.

## GitHub Actions

1. Open the repository or organization **Settings → Webhooks** in GitHub and
   choose **Add webhook**.
2. Set the payload URL to:

   ```text
   https://flowpeek.example.com/api/webhooks/github/<provider-account-id>
   ```

3. Select `application/json` as the content type.
4. Paste this account's Flowpeek webhook secret into GitHub's **Secret** field.
5. Subscribe to the **Workflow runs** event. GitHub calls this `workflow_run`;
   its completed activity is the most useful update for status tracking.
6. Keep SSL verification enabled and save the webhook.

Flowpeek verifies the raw request body with GitHub's
`X-Hub-Signature-256` HMAC-SHA256 header and records `X-GitHub-Delivery` for
idempotency. See GitHub's [webhook event documentation](https://docs.github.com/en/webhooks/webhook-events-and-payloads).

## GitLab pipelines

1. Open the GitLab project or group **Settings → Webhooks** and select **Add
   new webhook**.
2. Set the URL to:

   ```text
   https://flowpeek.example.com/api/webhooks/gitlab/<provider-account-id>
   ```

3. Generate a **Signing token**, copy the complete value (including `whsec_`),
   and store that exact value as this Flowpeek account's encrypted webhook
   secret. GitLab displays the signing token only once.
4. Select the **Pipeline events** trigger and keep SSL verification enabled.
5. Save the webhook and send a test delivery only after the Flowpeek secret is
   configured.

Flowpeek verifies GitLab's current Standard Webhooks HMAC-SHA256 signature over
the raw body and prefers `webhook-id` for idempotency. It also supports the
legacy `X-Gitlab-Token` and `X-Gitlab-Event-UUID` headers for older GitLab
instances, but new webhooks should use signing tokens. See GitLab's
[webhook configuration documentation](https://docs.gitlab.com/user/project/integrations/webhooks/)
and [pipeline event reference](https://docs.gitlab.com/user/project/integrations/webhook_events/).

## Forgejo Actions

1. In the relevant Forgejo repository or organization, open **Settings →
   Webhooks** and add a native **Forgejo** webhook with POST JSON payloads.
2. Set the target URL to:

   ```text
   https://flowpeek.example.com/api/webhooks/forgejo/<provider-account-id>
   ```

3. Set the webhook secret to this account's unique Flowpeek webhook secret.
4. Select **Push events**, which Forgejo documents for native webhooks. If the
   installed Forgejo version exposes an Actions or workflow-run event, it can
   be selected in addition. Polling remains the source of truth for run
   completion status.
5. Keep TLS verification enabled and save the webhook.

Flowpeek verifies the raw request body with Forgejo's
`X-Forgejo-Signature` HMAC-SHA256 header and records `X-Forgejo-Delivery` for
idempotency. Gitea-compatible headers are accepted only for compatibility. The
monitored instance must expose the read-only Actions run API; otherwise
Flowpeek reports the adapter limitation during synchronization. See the Forgejo
[webhook documentation](https://forgejo.org/docs/latest/user/repository/webhooks/)
and [Actions guide](https://forgejo.org/docs/latest/user/actions/overview/).

## Troubleshooting

- `401` means Flowpeek could not verify the account, secret, signature, or
  delivery ID. Confirm the provider endpoint, account UUID, and exact secret.
- `202` with `duplicate: true` is safe and expected when a provider retries a
  delivery.
- A successful delivery does not mean a provider workflow was modified:
  Flowpeek only performs a read-only synchronization afterwards.
- Check `/api/health` for the last persisted provider synchronization status.
  The health endpoint does not contact providers or expose secrets.
