# Miles & Meals v80 — Locked Trips, Journey Results and Offline 3.0

v80 closes the remaining workflow gaps found during the responsive PWA review.

## Add Expense and financial locks

- A Trip whose expense ledger is `CLOSED` is removed from the new-expense Trip selector.
- If another accessible Trip is still open, Add Expense chooses an open Trip instead of blocking the whole screen.
- If every accessible Trip is closed, the existing final-settlement lock panel is shown.
- The selector displays `Trip name · Destination` so similarly named Trips remain distinguishable.
- The API continues to enforce the financial lock; the UI is now consistent with it.

## Invite link and QR lifetime

- A newly generated invite token expires exactly 12 hours after creation.
- The link and QR encode the same token and therefore share the same expiry.
- Existing unrevoked tokens are also rejected when they are more than 12 hours old, even if an older release stored a later `expiresAt` value.
- The invite panel states the 12-hour limit and shows the local expiry time.

## Multi-country Journey result

A Journey is an optional route folder for several single-country Trips. After selecting Trips and saving, **View Journey** opens a dedicated route overview. It orders the stops, shows dates, destination, base currency and financial-lock status, and can switch directly into each Trip.

Journey grouping does not merge currencies, expenses or settlements. Those remain isolated in the underlying Trips.

## Offline 3.0

- The browser can store up to 12 recent Trip packs instead of overwriting one active pack.
- The online and standalone offline screens both provide a Trip selector.
- Quick Expense explicitly offers the Trip destination currency and Trip base currency.
- Every queued expense stores the selected Trip's country ID, currency and Trip name, so a later active-Trip change cannot redirect it.
- Closed Trips remain readable offline but cannot queue new expenses.
- The reconnect event bypasses a previous network backoff once and immediately retries safe queued changes. Validation/auth/conflict responses remain visible for review.

Offline data remains local to that browser/device and is removed by the existing private-device-data cleanup.

## Calendar and PWA update reliability

The 42-day calendar is forced into normal form flow with full-width containment from compact phones through desktop/browser zoom. The service worker now activates each new release immediately, claims open clients and removes old caches so stale PWA CSS cannot preserve a clipped calendar after deployment.

## Database and validation

v80 adds no database schema changes beyond v77. The release gate includes v53–v80 validators, route/source integrity, TypeScript, 73 Vitest assertions and the production Next build. Authenticated Playwright execution still requires an E2E test account and installed browser binaries.
