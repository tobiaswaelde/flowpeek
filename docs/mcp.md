---
title: MCP access
description: Connect header-configurable MCP clients to ezRepo's permission-aware read-only workflow tools.
---

# MCP access

ezRepo exposes a stateless Model Context Protocol v2 endpoint at `/mcp`. It provides read-only access to the same
repositories, workflow runs, failure queues, approval queues, summaries, and trends that the authenticated user may see
in ezRepo.

The MCP server reads the local ezRepo database. It does not call provider mutation APIs, start synchronization, approve
workflows, or change ezRepo configuration.

## Create an access token

Open **Settings**, find **MCP access**, and create a named token. Expiration is optional. Copy the complete token from
the creation dialog because ezRepo displays it only once and stores only its SHA-256 hash.

Revoking a token takes effect on the next request. Deleting its user also deletes the token. Changes to the user's role
or repository memberships apply immediately because every request resolves current authorization from the database.

## Configure a client

Use the public ezRepo origin followed by `/mcp` and send the token in the authorization header:

```text
URL: https://ezrepo.example.com/mcp
Authorization: Bearer ezrepo_mcp_REPLACE_WITH_TOKEN
```

The first release targets MCP clients that support custom HTTP headers, such as editor and command-line clients. It does
not provide OAuth discovery and does not claim compatibility with hosts that require the MCP OAuth flow.

Never place the token in a URL, query parameter, tracked configuration file, shell history, or log. Prefer the client's
secret storage or an unversioned environment variable.

## Available tools

| Tool                     | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `list_repositories`      | List visible tracked repositories.                             |
| `get_repository`         | Read one visible tracked repository.                           |
| `list_workflow_runs`     | Query normalized visible workflow runs.                        |
| `list_needs_attention`   | List workflow contexts whose newest terminal run failed.       |
| `list_awaiting_approval` | List current visible runs waiting for provider approval.       |
| `get_dashboard_summary`  | Summarize visible workflow health for an inclusive time range. |
| `get_workflow_trend`     | Aggregate visible success and failure trend buckets.           |

List tools default to 25 results per page and accept at most 100. Tool output contains structured JSON and a matching
text representation. Dates use ISO 8601 UTC values.

The server intentionally advertises no MCP resources, prompts, tasks, subscriptions, provider actions, or configuration
tools.

## Reverse proxy requirements

- Forward `POST /mcp` to the API container without rewriting it to `/api/v1/mcp`.
- Forward `Authorization`, `Origin`, `Content-Type`, `Accept`, `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name`.
- Use TLS at the reverse proxy and do not log authorization headers or request query strings.
- Add every permitted browser origin to `CORS_ORIGIN`. Requests without an `Origin` header remain supported for native
  clients; present origins must match the configured allowlist.

## Token administration

Users manage their own tokens in Settings. System administrators can inspect safe token metadata and revoke a token from
the Users page, but cannot retrieve its hash or plaintext secret and cannot create a token on another user's behalf.
