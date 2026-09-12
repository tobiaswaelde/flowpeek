---
title: Workflow dashboard
description: Read workflow health, current failures, and approval queues from the ezRepo dashboard.
---

# Workflow dashboard

![ezRepo dashboard](/screenshots/dashboard.png)

The dashboard summarizes successful, failed, queued, and running workflow runs within the selected time range. Use
**Refresh** to reload current data. Open **Needs attention** for repositories whose newest terminal workflow run failed,
or **Awaiting approval** to open the provider action that requires a human decision.

ezRepo never performs that approval itself; every provider action remains an external link.
