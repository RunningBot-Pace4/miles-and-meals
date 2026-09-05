# v67 — Phase 9–14 Production Launch Candidate

v67 consolidates Phase 9 through Phase 14 into one production-quality release. The goal is not to add another pile of travel features; it is to make the existing product safer, easier to operate, easier to test and much harder to break.

> **Important:** v67 is engineered toward a world-class product standard, but source code alone cannot prove a "10/10" or world-ranking product. Real-device usability, multi-user concurrency, staging load tests, external security review and accessibility testing remain launch evidence gates.

## Phase 9 — Production hardening & QA

- Added `npm run source:check` to parse every TS/TSX source/test/E2E file and verify local imports.
- Added `npm run typecheck` to the prebuild quality gate.
- Added `npm run release:check` for prebuild validation + unit tests.
- Added authenticated mobile launch-candidate E2E coverage for Home, Planner, Expenses, Settlements, Trips, Activity and Search.
- Added a guarded financial-close E2E test that restores the fixture's original state after testing.
- Existing settlement, receipt, FX, currency and Smart Settlement unit tests remain included.

## Phase 10 — UX, mobile & accessibility polish

- Added a keyboard skip link to authenticated app pages.
- Added consistent `:focus-visible` treatment.
- Added reduced-motion support.
- Hardened mobile touch targets to at least 44px for primary form controls.
- Added responsive financial-close, collaboration and admin-insights layouts.
- Existing mobile Add Expense, sticky-save and money-input improvements remain intact.

## Phase 11 — Financial integrity & finalization

Trips now have a real financial checkpoint:

- `OPEN` — expenses may be added/edited/deleted.
- `CLOSED` — expense ledger is locked for final settlement.

When a Trip Owner/System Admin closes financials, Miles & Meals stores a versioned snapshot containing:

- expense total,
- direct outstanding transfer count,
- Smart Settlement recommended transfer count,
- settled transfer count,
- Smart Settlement plans,
- snapshot timestamp/version,
- checksum.

Expense write APIs enforce the lock server-side. Settlement confirmation remains available because closing the expense ledger is not the same as completing repayment.

Owners can reopen financials when a late/corrected expense is genuinely required. Reopening is logged and travelers are notified. Smart Settlement continues to be recommendation-only and does not rewrite the original ledger.

## Phase 12 — Collaboration

- Added a privacy-scoped collaboration pulse based on the activity ledger.
- Visible clients check for other-traveler changes approximately every 5 seconds.
- Expense, Settlement and Planner workspaces receive refresh events without requiring a manual browser refresh.
- Existing stale-edit protection still prevents silent last-write-wins overwrites.

This is intentionally lightweight near-real-time collaboration, not a claim of WebSocket-level instantaneous delivery.

## Phase 13 — Monitoring & product signals

Added privacy-minimal aggregate product analytics for an allowlisted set of operational events:

- page views,
- expense save success/failure,
- duplicate warnings,
- offline queue activity,
- Smart Settlement views,
- financial close/reopen,
- offline conflict review.

The analytics collector intentionally does **not** collect merchant names, expense amounts, itinerary titles, location coordinates or arbitrary query-string values.

System Admin now has **Product insights**, including:

- 7-day page views,
- expense save success rate,
- Smart Settlement views,
- client error count,
- API P95,
- offline queue count,
- top routes and client context.

## Phase 14 — Security, scale & launch readiness

- Added a Content Security Policy and additional production security headers.
- Disabled the `X-Powered-By` framework disclosure header.
- Added launch-readiness checks for secret/base-URL configuration, database consistency, PWA and production headers.
- Health checks validate financial close snapshots and impossible open/closed state combinations.
- Backup/restore now includes the financial-close fields while remaining compatible with older backup payloads.
- Product telemetry is intentionally excluded from user-data backup/restore.
- Added `npm run load:smoke` for authorized staging/local load smoke tests with P50/P95/P99/error-rate output.
- The load tool refuses remote targets unless `LOAD_TEST_ALLOW_REMOTE=1` is explicitly set.

Example staging load smoke:

```bash
LOAD_TEST_BASE_URL=https://your-staging.example.com \
LOAD_TEST_ALLOW_REMOTE=1 \
LOAD_TEST_REQUESTS=200 \
LOAD_TEST_CONCURRENCY=10 \
npm run load:smoke
```

Only run load tests against infrastructure you own or are authorized to test.

## Database migration required

**v66 → v67 requires a database schema update.**

New fields are added to `trips`, and v67 introduces `product_events`.

Recommended production order:

1. Take a current System Admin backup.
2. Deploy/test v67 against a staging database first when possible.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Apply the schema change:
   ```bash
   npm run db:push
   ```
5. Run the release checks:
   ```bash
   npm run release:check
   ```
6. Run the production build:
   ```bash
   npm run build
   ```
7. Deploy the same verified source.

Do **not** run the v67 application against a v66 database without applying the schema update because v67 reads the new trip financial columns.

## E2E launch gate

Authenticated E2E tests need an account fixture:

```bash
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

The financial-close mutation test is deliberately disabled unless all of these are supplied:

```bash
E2E_OWNER_EMAIL=...
E2E_OWNER_PASSWORD=...
E2E_FINANCIAL_TRIP_ID=...
E2E_ALLOW_FINANCIAL_MUTATION=1
```

The test restores the original financial state after the check.

## What still requires real evidence before a public "world-class" claim

Code-level hardening cannot replace:

- iPhone Safari/PWA real-device testing,
- Android Chrome/PWA real-device testing,
- 10–20 first-time-user usability sessions with no instructions,
- two/three-user simultaneous trip tests,
- a staging load run at expected launch traffic,
- external security/penetration review,
- accessibility audit with VoiceOver/TalkBack/keyboard,
- backup restore drill,
- operational monitoring after deployment.

The Admin **App health** page now keeps these external evidence gates visible instead of pretending static checks prove them.
