# Miles & Meals V90 Combined — honest 10/10 target

V90 combines the planned V86, V87, V88, V89 and V90 work in one release. The scorecard below is the release acceptance target. A green code gate means the implementation is present and regression-tested; it does not by itself prove a global top-10 market position.

## Ten-point scorecard

| Market dimension | V90 target | Acceptance evidence |
| --- | ---: | --- |
| Trip planning | 10/10 | One-country Trips, two-tap dates, reviewed import, itinerary/checklist/packing, calendar download and stable ordering |
| Group expenses | 10/10 | Multi-currency ledger, multiple payers, equal/percentage/share splits, receipts, comments, partial settlement and closed-Trip immutability |
| Collaboration | 10/10 | 12-hour invite/QR, activity history and Owner-managed permissions enforced by server APIs |
| Offline reliability | 10/10 | Multiple open Trip packs, original-ledger binding, finance/Plan/expenses/safety/documents/memories snapshots, automatic sync, edit/retry/discard recovery and sync history |
| Mobile PWA quality | 10/10 | Installable PWA, standalone offline shell, safe-area navigation and authenticated no-overflow E2E at 320/360/375/390/412/430 px |
| In-Trip usefulness | 10/10 | Smart daily order, overlap/buffer warnings, travel-mode routes, nearby discovery and emergency contacts |
| Privacy and safety | 10/10 | Private/shared document visibility, restricted file types/size, per-Trip permission enforcement, trusted mutations and security headers |
| Smart assistance | 10/10 | Explainable companion recommendations from Trip state, budget, receipts, Plan, documents, safety and settlement—without advertising bias |
| Operational reliability | 10/10 | V90 migration check, database consistency, API metrics, error capture, backup/restore/export coverage, source/route validators and unit/build gates |
| Retention and delight | 10/10 | Trip memories, Trip Wrapped, Journey grouping, discovery and useful before/during/after Trip states |

## V86–V90 delivered together

- **V86 — trust and production proof:** granular traveler permissions, server enforcement, V90 database readiness check, updated backup/restore/export and release evidence.
- **V87 — smarter days:** suggested daily order, timing conflicts, travel buffers, Google Maps directions by mode and nearby discovery.
- **V88 — documents and safety:** private/shared document vault, expiry awareness, emergency contacts, offline-safe access and the existing direct review-before-save Plan import. Trip Inbox and unreliable flight-number guessing remain retired.
- **V89 — offline workspace:** multiple open Trips, finance and expense snapshots, Plan, contacts, permitted documents and memories; editable queued changes keep their original Trip/currency/payer/sharing.
- **V90 — companion and memories:** transparent next-step suggestions, before/during/after guidance, discovery shortcuts and shareable Trip memories.

## Evidence still required before claiming “world top 10”

The product can be engineered to the 10/10 acceptance target, but a world top-10 claim needs external proof after deployment:

1. Run the authenticated Playwright suite on real iPhone Safari and Android Chrome devices.
2. Run sustained and peak load tests against production-like Neon and Vercel environments.
3. Complete an independent security review and WCAG 2.2 accessibility review.
4. Prove sync success, crash-free sessions, retention, task completion and customer satisfaction with real users.
5. Benchmark the live product against current market leaders and validate willingness to switch/pay.

Until those results exist, the honest statement is: **V90 is a strong, broad travel-group PWA with a 10/10 internal acceptance target; global top-10 status is not yet proven.**

## Release gate

1. Back up or branch Neon.
2. Run `neon-upgrade-v85-combined.sql` if V85 is not already installed.
3. Run `neon-upgrade-v90-combined.sql`.
4. Configure production authentication URLs/secrets and optional Web Push keys.
5. Run `npm run release:check` and `npm run build`.
6. Run `npm run test:e2e` with `E2E_EMAIL` and `E2E_PASSWORD` against the deployed candidate.
7. Open **More → App health & V90 readiness** and confirm the database, consistency and V90 data-model checks are green.
