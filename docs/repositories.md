# Tracked repositories

ezRepo identifies a tracked repository by its provider account and stable provider repository ID. The displayed owner,
namespace, name, and URL are provider-owned metadata and are not editable as free-form local values.

Before every workflow synchronization, ezRepo reads the repository metadata from the provider. Renames and transfers
therefore retain the existing workflow history, filters, memberships, notification rules, and notification channels.
A system administrator can trigger the same read-only update immediately with **Refresh provider data** on the
repository details page.

ezRepo updates metadata only when the provider returns the same stable repository ID. If the repository was deleted,
became inaccessible, or a different repository now uses the previous path, ezRepo preserves the tracked repository and
its history and reports a synchronization error. Add a recreated repository as a new tracked repository instead of
reassigning the existing record.
