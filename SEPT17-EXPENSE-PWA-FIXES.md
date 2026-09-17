# Expense and payment usability fixes — 17 September 2026

## Changes

- Expense trip switching updates the visible trip and currency immediately, with inline progress instead of a full-screen switching overlay. Save remains disabled while the trip context or travelers are loading. Network failure is reported without silently moving the expense to a different trip.
- Added a visible trip date range, separate from the editable expense date. Dates use an unambiguous day/month-name/year format.
- Restored expense-header padding, reduced oversized heading text, and stacked the scan-receipt action on phones. Shared styles apply to both Add and Edit expense.
- Home payment details retain their expanded state when the selected trip or outstanding amount changes. Receipt selections and the amount still reset for the newly chosen trip.
- Fixed a false edit-conflict path: PostgreSQL timestamps can have microseconds, while JavaScript Dates preserve milliseconds. A timestamp equality predicate could therefore reject a freshly created, unchanged expense. The transaction now locks the expense row and checks the submitted version before updating by ID. Genuine stale edits remain rejected; this is not a force-overwrite workaround.
- Made stale-edit wording neutral: a version conflict is not evidence that another traveler changed the expense, nor does it describe payment status.

## Verification boundaries

The supplied screenshots and related source paths were reviewed. Automated release checks, tests, and build results are reported with the delivered package. Database concurrency integration requires a configured test database; installed-iPhone layout and offline lifecycle still require device acceptance. These source changes are not deployed automatically.

No database reset or schema migration is needed for this patch. Do not clear PWA storage or reinstall while unsynced offline records exist.
