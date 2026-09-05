# Miles & Meals v78 — Trip Dates, Offline Resync & PWA Polish

v78 is a UX/reliability release on top of the full v77 web/PWA source.

## 1. Settle Up trip selection is immediate

The extra `View trip` button is removed. Selecting a Trip from the Settle Up dropdown now:

1. updates the active Trip;
2. opens that Trip's settlement workspace immediately;
3. shows a loading overlay while balances are loading.

When offline, the currently loaded settlement remains visible and Miles & Meals explains that switching Trips needs a connection.

## 2. Two-tap travel date range

Trip creation/editing now uses one travel-date range control instead of two ambiguous browser date fields.

Flow:

`tap 5 Nov` → Start = 5 Nov

`tap 9 Nov` → End = 9 Nov

The same control is used in Trip Owner, System Admin and optional Journey date editing. The server also rejects an end date earlier than the start date.

## 3. Journey explanation

Journey remains optional. It is only a grouping/folder for one holiday that contains several single-country Trips.

Example:

`Europe Holiday 2027`

- France Trip
- Italy Trip
- Switzerland Trip

Each Trip keeps its own destination, currency, expenses and settlement. Journey never merges the financial ledgers.

## 4. Trip Inbox flight-number behavior

Trip Inbox can now recognize a typed flight number such as `AK6128`, including a small set of common airline-code labels. It also extracts route text such as `KUL -> NRT` when that information exists in the booking confirmation.

It does **not** pretend that a booking/PNR number alone can retrieve a private airline reservation. An ambiguous bare code such as `ABC123` is treated as a booking reference rather than being mislabeled as a flight. Date, time and route are filled from the pasted/uploaded confirmation. Live flight-status lookup would require an authorized external flight-data provider and is intentionally not faked in v78.

Raw imported booking bodies remain unpersisted.

## 5. Offline resync hardening

The previous queue could race when focus, online events and the 30-second timer triggered sync at the same time. A sync snapshot could also overwrite a newly queued change.

v78 changes the queue to:

- serialize every automatic/manual sync run across the Offline Pack, sync badge, focus/online handlers and timer;
- re-read each queued mutation before/after sending;
- preserve new items added while a sync is running;
- use retry backoff for temporary network/server failures;
- keep 400/401/403/404/409/422 changes blocked for review;
- allow per-item Retry / Discard;
- add an explicit `Sync N pending` button to Offline Pack;
- retain expense idempotency keys during retries;
- make offline Planner create/update/delete safe to retry when a server commit succeeded but the response was lost;
- refuse to silently discard old queued changes when the local queue reaches its safety limit.

## 6. Mobile/PWA pass

v78 adds/extends mobile coverage for 320, 360, 375, 390, 412 and 430px phone widths.

- `viewport-fit=cover` for PWA safe areas;
- v78 service-worker cache bump;
- single-column form layout on phones;
- date range calendar becomes a safe-area-aware mobile sheet;
- improved narrow-phone navigation and containment;
- Trip Inbox, Journey and offline retry controls stack safely;
- new authenticated Playwright audit covers the expanded v77/v78 routes.

## Database

No new database schema is introduced by v78. If upgrading from v77 and the v77 schema is already pushed, no new `db:push` is required specifically for v78.

If upgrading directly from v70 or earlier, the v77 schema additions are still required.

## Validation

Run:

```bash
npm install
npm run release:check
npm run build
```

For authenticated mobile browser coverage:

```bash
E2E_EMAIL="..." E2E_PASSWORD="..." npm run test:e2e
```

## Final v78 validation record

Completed in the packaging environment:

- v53 → v78 source/regression validators: PASS
- PWA validator: PASS
- Navigation validator: PASS
- Phase 8 validator: PASS
- Route integrity: 31 page routes / 201 source files: PASS
- Source integrity: 221 TS/TSX files / 0 parse errors / 0 missing local imports: PASS
- Service worker + static offline-shell JavaScript syntax: PASS
- Trip Inbox parser runtime smoke: flight vs ambiguous booking ref + route/date/time: PASS
- Offline queue runtime smoke: automatic/manual overlap serialization + safe 60-item capacity: PASS

The authenticated Playwright mobile audit is included for 320, 360, 375, 390, 412 and 430px widths. A complete Next production build and Playwright run require the project dependencies. The packaging environment could not reach `registry.npmjs.org` (`EAI_AGAIN`), so run `npm install`, `npm run release:check`, `npm run build` and the authenticated E2E suite in your normal development/staging environment before production deployment.
