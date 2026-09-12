---
title: Workflow queues
description: Filter workflow runs and distinguish failures from provider approval requirements.
---

# Workflow queues

![All workflow runs](/screenshots/workflow-runs.png)

**Workflow runs** provides the full permission-scoped history. Filter by repository, provider, status, duration, or
search text, and use the table controls to sort or choose visible columns.

**Needs attention** contains only the newest failed terminal workflow context. **Awaiting approval** is separate because
the workflow has not failed: it is waiting for an action in the provider interface.
