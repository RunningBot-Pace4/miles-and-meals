# Miles & Meals — simplified PWA update

## Included

- Home: Trip Overview remains visible. Packing, documents, itinerary, receipt and budget reminders now share the Needs attention area. Removed the separate Next steps block and retired Companion to a Home redirect.
- Add: the bottom action opens a compact native dialog with Expense, Plan, Memory and Document choices. Escape, close button and backdrop dismissal are supported; the old Add page remains a fallback.
- Payments: personal recommendations appear once, followed only by other travelers' payments. Removed the duplicate completed-payments list; the complete History view retains statuses, allocations, proofs and authorized reversals.
- Home's Payment history link opens History directly. Payment feedback includes the trip, amount, receipt allocation and remaining amount, distinguishing sent from confirmed payments.
- Navigation: linked legacy routes resolve to Spend, Updates and Trip Story. Hub tabs preserve explicit trip selection. Bills and receipt review load/poll the authorized selected trip; memories and budgets also honor the requested trip.
- Bills: receipt review is a secondary filter, not a fourth money tab. A count links directly to receipts needing review.
- Expense entry: optional payment metadata and scan diagnostics are collapsed, without removing stored data or scanning controls.
- Styling: colorful Add choices, shared button treatments and attention cards; mobile optional fields stack in one column. Removed unused Next steps styling.

## Safety and validation

Final local result: 302 tests passed; 4 database integration tests skipped. `npm run build` passed, including the prebuild validators, source integrity and TypeScript checks.

No database schema change or cleanup is required. This update does not erase records, alter settlement calculations or remove authorization checks. Existing bookmarks remain supported.

Automated tests and the production build are run locally using placeholder build-only environment settings. Database integration tests require a separate test database. Installed iPhone/Android PWA, keyboard, safe-area and live multi-user payment tests still require device verification; the local browser layout runner is blocked by the missing browser executable.

## Deploy

Use this complete source package to update your existing repository, preserving your configured Vercel environment variables. Follow DEPLOY-VERCEL.md. Do not run a database reset script for this UI update. Deploy to preview first, then check the Home payment flow, trip switching, Add dialog and background refresh on your phone before promoting to production.

This package has not been deployed to your Vercel account.
