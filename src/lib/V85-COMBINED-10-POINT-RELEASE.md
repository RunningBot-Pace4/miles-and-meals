# V85 Combined — V83, V84 and V85

This release combines the three planned phases into one deployable package. Each scorecard area has a 10/10 acceptance target and an automated source, type, unit or browser gate where practical.

## 10-point scorecard

| Area | Target | Delivered acceptance criteria |
| --- | ---: | --- |
| Home and trip clarity | 10/10 | Stage-aware Trip Command Centre, next plan, today summary, allowance and forecast |
| Offline reliability | 10/10 | Original Trip/currency/sharing retained, automatic retry, actionable blocked state and sync history |
| Closed-Trip integrity | 10/10 | Closed Trips remain viewable but every content and financial write is server-blocked |
| Planning | 10/10 | Ordered day plan, duration, Tasks, Packing, route opening and calendar export |
| Confirmation import | 10/10 | Paste/TXT/EML extraction with an editable review step; no raw message retention or flight guessing |
| Expense entry | 10/10 | Multiple payers, weighted shares, saved split presets and mobile-safe controls |
| Budget control | 10/10 | Trip-category limits with spend progress and owner-only editing |
| Financial trust | 10/10 | Partial settlement, expense comments, receipt review status and low-confidence queue |
| Mobile/PWA design | 10/10 | Containment rules and E2E coverage at 320, 360, 375, 390, 412 and 430 px |
| Data safety and release quality | 10/10 | Neon migration, admin-preserving reset, backup/export coverage, unit tests and build validators |

The score is an acceptance target, not a promise that future real-device or production telemetry will never reveal another edge case. Any failed gate blocks the release.

## Product rules retained

- One country per Trip; a Journey only groups multiple Trips.
- Trip Inbox, booking/reservation inbox and flight-number guessing remain retired.
- Invite links and QR codes remain valid for 12 hours.
- A closed Trip is read-only across Trip settings, Plan, budgets, expenses and collaboration.
- Offline changes always return to the Trip, destination currency and sharing selection captured when saved.

## Upgrade

1. Create a Neon backup or branch.
2. Run `neon-upgrade-v85-combined.sql` in Neon SQL Editor, or run `npm run db:push` with the correct `DATABASE_URL`.
3. Run `npm install`, `npm run release:check`, then `npm run build`.
4. Deploy the resulting V85 source. Do not run a reset script during a normal upgrade.

## Verification

- `npm run v85:check` — combined feature/schema/source gate.
- `npm test` — unit and regression suite.
- `npm run build` — all historical validators, route integrity, type checking and production compilation.
- `E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e -- e2e/mobile-v85-combined.spec.ts` — authenticated multi-viewport browser audit.

The browser audit requires a deployed or local test database with at least one open Trip. It is intentionally skipped when credentials are not supplied.
