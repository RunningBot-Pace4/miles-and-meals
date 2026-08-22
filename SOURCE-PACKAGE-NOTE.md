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
