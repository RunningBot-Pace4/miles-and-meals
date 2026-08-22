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
