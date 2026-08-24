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
