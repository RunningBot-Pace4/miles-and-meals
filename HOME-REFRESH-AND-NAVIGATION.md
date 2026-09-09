# Home refresh, direct bill payment and screen consolidation

## Refresh timing

Before this update, missing-budget checks ran every 120 seconds. Home finance
cards polled every 30 seconds and collaboration alerts every 60 seconds. The
server-rendered Home summary did not receive those card updates.

Now missing-budget checks and Home server-data refresh run every 15 seconds
while online and visible. Returning to the page, reconnecting and local change
events also trigger checks. Allow request/DB processing time in addition to the
interval; this is polling, not an instantaneous push guarantee. Background PWA
windows are paused by design and browsers may suspend timers.

Home refresh merges server data without a full document reload. Client finance
and settlement components adopt fresh initial data as it arrives. It pauses
during saving, dialogs or form editing. Existing finance/settlement API polling
continues as fallback. Budget requests now time out after eight seconds rather
than holding the polling lock indefinitely.

## Home design

The large Welcome back banner and slogan are replaced with a small personal
greeting, prominent trip name and destination/date line on a light compact card.
The no-trip state asks Where to next? Main navigation and travel tools remain.

## Shorter bill payment flow

Spend → Expenses → Bill & payment history → select this bill and enter amount.
You no longer need to open a person statement first. The same allocator and
server checks enforce payer/receiver permissions, pending-payment reservations,
direct-balance limits and closed-trip rules. The detail page refreshes its data
on the same visible-page interval. Statements remain available for cross-bill
history; Settle Up remains available for netting and payment confirmations.

## Removed duplicate standalone entry points

The following old URLs now redirect to consolidated tabs (temporary redirects
to avoid sticky browser caches). Existing content is reused internally.

| Old screen | Canonical screen |
| --- | --- |
| /expenses | /spend |
| /settlements | /spend?tab=settlements |
| /settings/budgets | /spend?tab=budgets |
| /receipts | /spend?tab=review |
| /notifications | /updates |
| /activity | /updates?tab=activity |
| /memories | /trip-story |
| /wrapped | /trip-story?tab=highlights |

Companion's duplicate More-menu entry is removed; detailed checks remain linked
from Home's next steps. Bill details, expense editing, statements, offline sync,
trip management and account/admin tools remain because they serve distinct tasks.

## Validation

- npm run build passed, including release validators and TypeScript.
- 254 tests passed; four database integration tests skipped without a test DB.
- All eight redirects checked against the running production server, including
  preservation of tripId for settlements and highlights.
- Two-account live refresh and browser/PWA visual testing still need real-account
  validation. This package has not been deployed and no live data was changed.
- No SQL migration or reset is needed. The earlier optional reset script remains
  in the package, but it is unrelated to this update and should not be run for it.

After deploying, leave Home visible on user B's device, assign a trip or expense
from user A, and allow a polling interval plus network time. Confirm the budget
prompt or updated Home values. Repeat after backgrounding and reopening the PWA.
