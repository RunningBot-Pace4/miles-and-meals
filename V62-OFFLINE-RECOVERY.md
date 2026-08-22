# Miles & Meals v62 — Offline Mutation Queue + Recovery

## Offline queue

When the device is offline, supported changes can be stored on the device and retried automatically after connection returns.

Queued actions include:

- create expense
- edit expense
- add planner item
- edit planner item
- delete planner item

A small pending-sync pill shows how many local changes are waiting.

## Recovery

Existing draft recovery remains in place, while the existing trip JSON/CSV export and System Admin backup/restore remain available for data safety.

Queued changes are kept if the server rejects them rather than silently discarding user data.

No database migration is required.
