# Notification configuration

Flowpeek sends repository workflow notifications through [Apprise](https://appriseit.com/). Each channel has a
friendly name and exactly one Apprise notification URL, such as a Discord, mail, ntfy, or Gotify URL. Consult the
[Apprise service documentation](https://appriseit.com/services/) for the URL format supported by the destination.

The complete URL is encrypted with Flowpeek's `TOKEN_ENCRYPTION_KEY` before it is stored. It is write-only in the
API and never returned to the web application, logs, delivery history, or error messages. Flowpeek retains only the
URL scheme as display metadata. At delivery time, the API creates a short-lived owner-only configuration file for
the Apprise CLI and removes it after the command exits; URLs are never supplied as process arguments.

## Migrating existing channels

The previous Email, Gotify, and ntfy channel formats cannot be converted automatically. Their tokens are encrypted
independently and the old SMTP configuration may have been global, so a database migration cannot assemble a safe
replacement URL. Existing channels are therefore disabled and marked as requiring reconfiguration. Their IDs,
repository ownership, rule links, delivery records, and delivery attempts are preserved.

For every affected channel, an authorized repository manager must replace its URL with a valid Apprise URL and then
enable it again. Existing rules will use the same channel record after it is reconfigured; no rule recreation is
needed.
