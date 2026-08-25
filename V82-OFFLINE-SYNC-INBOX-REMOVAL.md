# v82 — Offline Sync Recovery & Trip Inbox Removal

> v82.1 deployment hotfix: `prebuild` now removes any retired Inbox/flight files left behind when this source is extracted over an older checkout.

This release removes the Trip Inbox / booking-reservation workflow and fixes the offline retry loop reported after reconnection.

## Offline sync

- Queued Expense and Plan mutations are authorized against the Trip saved inside the change, not whichever Trip happens to be active when connectivity returns.
- Closed Trips (`423`) and other non-retryable client responses stop after one server attempt. The sync sheet marks them as needing action and offers **Discard**; background, focus, online and manual sync no longer retry them forever.
- Network failures and temporary timeout/rate-limit responses remain stored on the device and retry safely with backoff.
- Generic `Forbidden` responses are translated into an explanation about expired sign-in or removed Trip access. The API also returns an actionable `TRIP_ACCESS_REMOVED` code.
- An existing v81 item stuck at `Forbidden` (including a high attempt count) receives one compatibility retry under the corrected access rule.

## Removed workflow

- Trip Inbox page, client, import API, Add-to-Plan bridge, booking parser, live flight lookup and PWA shortcut are removed.
- The Planner **Bookings** tab/item type and the offline Reservations card are removed.
- Legacy `trip_inbox_items` database data is left untouched for safe backup compatibility; it is no longer exposed by the app.

## Add Expense

- The sentence about financially locked Trips being hidden is removed.
- `Forbidden` was not a payment-method error. It was the old active-Trip authorization check rejecting a valid target Trip; that check is replaced with durable membership access while the existing closed-Trip write barrier remains enforced.

No database migration is required for v82.
