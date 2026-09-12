---
title: Tracked repositories
description: Repository identity, rename handling, metadata refresh behavior, and read-only synchronization rules.
---

# Tracked repositories

ezRepo identifies a tracked repository by its provider account and stable provider repository ID. The displayed owner,
namespace, name, and URL are provider-owned metadata and are not editable as free-form local values.

Before every workflow synchronization, ezRepo reads the repository metadata from the provider. Renames and transfers
therefore retain the existing workflow history, filters, memberships, notification rules, and notification channels.
A system administrator can trigger the same read-only update immediately with **Refresh provider data** in the
repository dialog opened from the repository table.

ezRepo updates metadata only when the provider returns the same stable repository ID. If the repository was deleted,
became inaccessible, or a different repository now uses the previous path, ezRepo preserves the tracked repository and
its history and reports a synchronization error. Add a recreated repository as a new tracked repository instead of
reassigning the existing record.

## Members and profile pictures

The repository table shows the users with explicit access as a compact avatar group. Up to five members are visible;
the remaining count is summarized when a repository has more members. Member identities are returned only together
with repositories the signed-in user is allowed to read.

Every user can manage their personal name, login username, and profile picture in the **General** tab under Settings.
Personal names are optional and become the preferred display identity, while the username remains visible for
unambiguous account identification. Changing the login username requires the user's current password.

JPEG, PNG, and WebP sources up to 2 MB can be uploaded or imported from a public HTTPS URL. Non-square sources must be
cropped before they are saved. ezRepo removes image metadata, renders a 256 × 256 WebP, and stores only that normalized
image in PostgreSQL. The original file and remote URL are not retained. Users without a profile picture are represented
by initials derived from their personal name or username.
