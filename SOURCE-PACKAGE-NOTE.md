# Miles & Meals V92.12 — Receipt Accuracy and PWA Layout Package

This is the complete source package, versioned `1.92.12`. It preserves the approved light Living Journey design while adding automatic receipt-paper isolation, higher-resolution local OCR preparation, balanced phone section headings and a true tablet command-centre layout.

The authenticated route audit covers phone, small-tablet, iPad, landscape-tablet and desktop widths. **No new Neon migration is required** when upgrading from an already migrated V90/V91/V92 deployment.

See `START-HERE-V92.md` for deployment and validation instructions.

---

# Miles & Meals V90 Combined — Audited Full Source Package

This is the complete V86 + V87 + V88 + V89 + V90 release, versioned `1.90.0`.

It includes all V85 foundations plus traveler permissions, smart day routes, the document and emergency vault, fuller editable offline packs, companion guidance, discovery and memories. The 10-point target and honest external-proof boundary are in `V90-COMBINED-WORLD-CLASS-TARGET.md`.

**Database:** this release adds schema. Back up or branch Neon, run `neon-upgrade-v85-combined.sql` if needed, then run `neon-upgrade-v90-combined.sql` before deployment. Never use a reset script as an upgrade.

**Validated:** 84/84 unit tests, all historical source gates, V90 acceptance validation, route/source integrity, TypeScript and the Next.js production build pass in the packaging environment. Authenticated real-device E2E remains a deployment-stage evidence gate.

---

# Miles & Meals v82.2 — Audited Full Source Package

v82.2 removes closed Trips from every offline-pack layer, adds traveler selection for offline expense sharing, refreshes Home and Settlement data silently after a successful reconnect sync, and mounts mobile navigation at the document viewport so it cannot float inside long Settlement content.

See `V82.2-OFFLINE-SHARING-MOBILE-REFRESH.md`.

---

# Miles & Meals v82.1 — Audited Full Source Package

v82.1 adds an overlay-safe prebuild cleanup for the Trip Inbox, booking parser and flight lookup files retired in v82. This prevents stale files from an older extracted checkout from failing Vercel validation or recreating removed routes.

---

# Miles & Meals v82 — Audited Full Source Package

This package contains the complete application through v81 plus the v82 offline-resync correction and Trip Inbox removal.

Key v82 behavior:

- queued Expense and Plan changes remain bound to their original Trip after reconnection;
- permanent 4xx failures, including closed Trips, stop retrying and require review/discard;
- valid Trip members no longer receive a raw `Forbidden` error because another Trip is active;
- Trip Inbox, booking/reservation UI, APIs, parser, flight lookup, Planner tab and offline reservation card are removed;
- the financially locked Trip sentence is removed from Add Expense;
- the service-worker cache is bumped to v82.

**Database:** v82 adds no schema and deliberately preserves legacy Inbox rows for backup compatibility.

See `V82-OFFLINE-SYNC-INBOX-REMOVAL.md`.

---

# Miles & Meals v81 — Audited Full Source Package

This package contains the complete application through v80 plus the v81 flight-accuracy, whole-Trip read-only, automatic all-Trip offline and mobile containment fixes.

Key v81 behavior:

- departure dates/times are parsed from the departure section instead of booking-issued metadata;
- exact flight number + date live lookup is available when `AVIATIONSTACK_API_KEY` is configured;
- a closed Trip is read-only across Trip, travelers, invites, budget, Plan, Inbox, expenses and location writes, while settlement repayment confirmation remains available;
- all accessible Trips are automatically refreshed into the device’s private offline packs and remain Trip/currency-bound during resync;
- phone form controls, native date fields, long selects and the standalone offline screen are contained at 320–430px;
- the service-worker cache is bumped to v81 so stale layout assets are replaced.

**Database:** v81 adds no schema beyond v77. If the v77 schema is already applied, do not run a database reset or migration specifically for v81.

See `V81-FLIGHT-CLOSED-OFFLINE-MOBILE.md`.

---

# Miles & Meals v80 — Audited Full Source Package

This package contains the complete application through v79 plus the v80 locked-Trip, Journey-result, multi-Trip offline and PWA cache-reliability fixes.

Key v80 behavior:

- financially closed Trips cannot be chosen for a new expense;
- invite link/QR tokens expire after exactly 12 hours;
- Journey grouping has a dedicated route result with direct Trip navigation;
- Offline 3.0 stores/selects several Trip packs and queues the correct Trip/currency;
- reconnect immediately retries network-failed mutations;
- the full calendar remains in form flow and the service worker replaces stale cached layouts immediately.

**Database:** v80 adds no schema beyond v77. If the v77 schema is already applied, do not run a database reset or migration specifically for v80.

See `V80-LOCKED-TRIPS-JOURNEYS-OFFLINE.md`.

---

# Miles & Meals v79 — Audited Full Source Package

This package contains the full application through v78 plus the v79 responsive/function reliability audit.

Key v79 behavior:

- the trip/Journey calendar is in normal document flow and cannot be clipped or overlap a submit button;
- complete date values wrap safely instead of being hidden by ellipsis;
- native trip/user/currency/region dropdown labels are compact on narrow screens;
- explicit offline resync bypasses automatic backoff and retries immediately;
- Vitest and Playwright are correctly separated;
- the release gate includes unit, TypeScript, PWA, route, source, legacy-regression and v79-specific validators.

**Database:** v79 adds no schema beyond v77. If the v77 schema is already applied, do not run a database reset or migration specifically for v79.

See `V79-UX-RESPONSIVE-AUDIT.md`.

---

# Miles & Meals v78 — Full Source Package

This package contains the complete v71–v77 enhancement set plus the v78 UX/reliability pass.

Key v78 behavior:

- Settle Up changes Trip immediately from the dropdown; no second View button.
- Trip/Journey dates use a two-tap Start → End calendar.
- Journey wording is simplified as an optional multi-country holiday folder.
- Trip Inbox safely distinguishes flight numbers from ambiguous/private booking references.
- Offline queue flushing is serialized, queue capacity fails safely instead of dropping old work, and offline Planner retries are idempotent across response loss.
- PWA/mobile audit targets 320–430px widths with safe-area-aware layouts.

**Database:** v78 adds no schema beyond v77. If upgrading from v70 or earlier, apply the v77 schema after taking a Neon backup/branch.

A dependency-backed Next production build still requires `npm install` in a network-enabled development/deployment environment.

See `V78-TRIP-DATES-OFFLINE-PWA-POLISH.md`.

---

# Miles & Meals v77 — Full Source Package

This is the consolidated **v71–v77 mobile-web/PWA enhancement pack** built on the complete v70 source.

Included:

- secure Trip invite/join/revoke flow with private QR generation
- Journey grouping while preserving 1 Trip = 1 Country
- auditable receipt itemization with exact cent reconciliation
- privacy-minimal Trip Inbox and idempotent Add-to-Plan recovery
- Offline 2.0 trip pack + offline Quick Expense queue
- Smart Settlement payment-assistance tools
- regional preference and PWA/mobile-web launch foundation
- updated Admin backup/restore and keep-login Neon reset coverage for all new v71–v77 tables

**Database migration is required from v70 to v77.** Take a Neon backup/branch and run `npm run db:push`. Never use a reset command as an upgrade mechanism.

The source/regression gates included in this package pass in the packaging environment. A complete dependency-backed Next production build still requires `npm install`; the packaging environment could not reach the npm registry (`EAI_AGAIN`), so `npm run build` must be executed in your normal development/Vercel environment before deployment.

See `V77-FINAL-RELEASE-GATE.md` for the exact validation record.

---

# Miles & Meals v70 — Full Source Package

This package adds an explainable/auditable Smart Settlement layer on top of the complete v69 source.

Key v70 behavior:

- Every recommended transfer has a **View details** drill-down.
- Users can switch between **Smart Settlement**, **Original Balances** and **History** without leaving Settle Up.
- Original balances expand into the exact expense-share transactions that created the obligation.
- Recommended-transfer details show transparent net-position math and direct opposing balances when applicable.
- Recorded settlement payments remain separate from original expense evidence so group-netted payments are never falsely assigned to one receipt.
- Original expense and settlement records are not rewritten.

No new schema migration is required from v69 to v70. The v67 schema changes must already exist.

See `V70-EXPLAINABLE-SMART-SETTLEMENT.md`.

# Miles & Meals v69 — Full Source Package

This package adds the v69 mobile-flow/navigation reliability pass on top of the complete v68/v67 launch-candidate source.

Key v69 behavior:

- Context-aware Back control on secondary mobile pages only.
- Trip Wrapped dropdown opens the selected trip immediately and syncs active-trip context.
- Search keeps the mobile bottom tools available instead of auto-opening the software keyboard.
- Mobile layout is standardized for 320–430px widths with larger controls, iOS-safe form sizing and improved card/navigation spacing.
- Core signed-in routes have new multi-viewport E2E regression coverage.
- `scripts/neon-reset-keep-login.sql` and `db:reset:keep-login` can clear application data while preserving login/auth records.

No new schema migration is required from v68 to v69. The v67 schema changes must already exist.

See `V69-MOBILE-FLOW-NAV-RESET.md`.

# v68 — Trip-first settlement dropdowns

Settle Up is now explicitly trip-scoped: the selector shows trip names and readiness, the financial checkpoint names the selected trip, and Live GPS also uses trip names instead of country-only labels. See `V68-TRIP-FIRST-SETTLEMENT-DROPDOWNS.md`.

# Miles & Meals v67 — Full Source Package

This package consolidates **Phase 9 through Phase 14** on top of the complete v66 source. It is a production launch-candidate/hardening release rather than a feature-count release.

Key v67 behavior:

- Versioned Trip financial close/reopen with server-enforced expense ledger locking.
- Financial close snapshots preserve totals, remaining balances, Smart Settlement recommendations and checksum metadata.
- Existing Smart Settlement remains read-only and the original repayment ledger remains the source of truth.
- Privacy-scoped ~5-second collaboration pulse plus stale-edit conflict protection.
- Privacy-minimal product event telemetry and a System Admin Product Insights screen.
- Mobile/accessibility consistency improvements, authenticated E2E launch coverage and source/typecheck release gates.
- CSP/security header hardening, launch-readiness health checks and safe load-smoke tooling.
- Backup/restore supports the new financial fields and older backup payloads.

**Database migration is required from v66 to v67.** Take a backup and run `npm run db:push` before starting/deploying v67 against that database.

See `V67-PHASE9-14-PRODUCTION-LAUNCH-CANDIDATE.md` for deployment order, test setup and the external evidence still required before making a world-class/public-launch claim.

# Miles & Meals v66 — Full Source Package

This package includes Smart Settlement plus the v66 reliability, collaboration, offline-recovery, privacy/security and mobile hardening work on top of the complete v65.1 source.

Key v66 behavior:

- Existing settlement actions/history remain unchanged; Smart Settlement is a read-only optimized recommendation layer.
- The JY/JH/Tan example resolves to JH → JY RM10 and Tan → JY RM40 instead of three opposite transfers.
- Up to 11 non-zero travelers use exact minimum-transfer optimization; larger groups use a fast deterministic fallback.
- Home can surface a post-trip Smart Settlement readiness action.
- New expense writes are idempotent across retries and can repair an interrupted split save.
- Expense and Planner stale edits return 409 instead of silently overwriting newer collaborative changes.
- Offline conflicts are visible/reviewable with retry and discard controls.
- Settlement retries are idempotent where safe.
- Participant-name queries are scoped; security headers and additional settlement-integrity checks are included.
- Existing v53-v65.1 product behavior remains included.

No database migration is required from v65.1 to v66.

See `V66-SMART-SETTLEMENT-WORLD-CLASS-HARDENING.md` for architecture, limitations and validation notes.

# Miles & Meals v65 — Full Source Package

This package includes the v65 Add Expense save-reliability fixes on top of the complete v64 source.

Key v65 behavior:

- React owns Add Expense validation so mobile Safari/PWA cannot silently block submit with native `required` validation.
- Save errors remain visible in the sticky Save bar and invalid fields are focused/scrolled into view.
- Tapping Save alone no longer creates a phantom unsaved draft.
- Duplicate-expense warnings are surfaced automatically.
- Save requests time out cleanly and repeated taps cannot create parallel submissions.
- Offline-queued expenses no longer recreate a stale draft after being queued.
- Existing v53-v64 behavior remains included.

No database migration is required from v64 to v65.

# Miles & Meals v63 — Full Source Package

This ZIP contains the complete v63 source tree, consolidated from the stable v58 baseline.

Included v63 behavior:

- Home still defaults to **View all trips** with the same dashboard screen used for individual trips.
- Mobile Add Expense is compacted and polished for phone use.
- Home adds an action centre and recent activity timeline.
- Receipt OCR adds receipt date/category intelligence and duplicate-expense protection.
- Planner items can open a prefilled Add Expense form.
- New Search page searches expenses, planner items and activity across accessible trips.
- Expense/planner changes can be queued offline and synced after reconnection.
- Existing JSON/CSV exports and System Admin backup/restore remain available for recovery.
- New Trip Wrapped page summarizes the trip after/during travel.
- v53-v58 settlement, notification, single-country, traveler assignment and Home-scope behavior remains included.

No database migration is required from v58 to v63.

## v64

This package includes the v64 Advanced Money Input redesign. No database migration is required from v63.


## v65.1 build hotfix

Fixed strict TypeScript compilation in the Add Expense submit-problem focus helper (`RadioNodeList` handling). No database migration is required.
