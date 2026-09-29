# Release review — 29 September 2026

## Result

The source is a release candidate with 428 passing automated tests and four skipped database integration tests. The production build passed. This is not a claim that every live workflow or iPhone screen has been verified.

## Changes

- Route-provider quota and access errors now reach the user as safe, specific messages. Arbitrary provider error bodies and keys are never returned.
- Route batches stop on service-wide failures instead of trying every remaining place. Previously saved route results are retained on errors. Another attempt requires Check distances.
- Place cards distinguish checking, unavailable, unchecked, and missing-pin states during the current check.
- Offline items cannot be edited or discarded in the same app session while their request is in flight. Controls unlock after failure. This prevents a successful old request from silently removing a newer correction.
- Plan panel titles wrap; their close buttons retain a 44-pixel width.
- PWA static cache version advances so the updated assets can be installed.
- Existing trip selection, bill allocation, partial payments, Home payments, payment history, and saved route behavior remain available. No database cleanup or schema migration is part of this update.

## Evidence and limits

| Area | What was checked | Result / limit |
| --- | --- | --- |
| Payments | Automated allocation, remainder, confirmation, reversal, authorization and ledger tests in the full suite | Passed; a complete two-user live trip was not executed |
| Imports / routing | Corrected-pin persistence, saved-route filtering, route units, provider failures and private error handling | Passed with mocked providers; no live routing quota/key validation |
| Offline | Queue retry, serialization, preservation and in-flight edit/discard regression | Passed in mocked browser storage; real device reconnect pending |
| Mobile layout | Source review of Plan modal widths, wrapping, 16px inputs, scrolling and safe-area rules | Close-button hardening applied; cloud desktop navigation checked, but no real iPhone visual sign-off |
| Duplicate screens | Home payment actions and detailed payment history reviewed | Kept: quick action and audit detail serve different purposes |
| Cleanup / recovery | Existing admin-preserving cleanup script and schema tests reviewed | Static tests passed; no backup, cleanup or restoration executed |
| Financial concurrency | Four PostgreSQL integration tests | Skipped: dedicated test database not configured |

## Before declaring the live release verified

Use a separate test trip and disposable test accounts. Do not run cleanup scripts to test this release.

1. Create a trip and assign two travelers. Confirm that both see the same trip and their own budget prompt.
2. Import corrected pins across Places, Meals and Shop. Verify one routing run in the selected mode; revisit tabs and confirm saved results. Test missing stay, unavailable provider, and manual retry.
3. Add shared bills of RM20 and RM40. Send RM45: the receipt allocation should cover RM20 + RM25 and leave RM15, with the sent amount clearly awaiting confirmation. Confirm it from the receiver account. Repeat using cancellation and verify the balance returns.
4. Save one expense offline, reconnect, and verify one server record. During sending, Edit and Discard should be disabled. Test the same workflow after closing and reopening the PWA.
5. On iPhone, check Home, Plan, Spend, People and More in portrait, with the keyboard open, long names and large values. All action buttons should remain reachable without horizontal scrolling. Check Plan sheet focus/close behavior.
6. Verify a database backup on a separate branch or restored database before any future destructive cleanup. Confirm record counts and admin login there; keep credentials out of shared reports.

## Deployment

Replace the project source in your Vercel-connected repository with this package and deploy normally. Keep existing environment variables and database contents. No new migration is needed. Let current offline changes finish syncing before updating the installed PWA. A previous deployment can be used for code rollback; this update changes no schema.


## Follow-up: backup confidence checks

The follow-up added seven backup API contract tests, using mocked storage. They verify route export and restore SQL, one read-only repeatable-read export transaction, connection cleanup on failure, version 6 compatibility, validation of route references/duplicates/measurements, and administrator/confirmation gates. These are not a real PostgreSQL restoration drill.

Backup format 7 now includes saved walking/driving route distances. Versions 1–6 remain accepted, with empty route results when absent. Routes restore after their planner parents inside the existing atomic restore batch. No schema migration is needed beyond the existing shared-route migration.

The export now reads a consistent database snapshot so ongoing edits cannot mix independently read table states. Account and password data remain excluded; the UI now makes the need for a separate account-capable database backup clearer.

Live browser observation: secure sign-in succeeded. Read-only checks covered Home, the Hong Kong itinerary, Places, Meals, Spend bills, and Smart Settlement details. Places loaded all 8 saved walking routes; Meals displayed all 24 saved walking routes. These checks verify display of saved results, not geographic accuracy or fresh provider calculations. Only one trip was available, so switching between multiple trips could not be tested live.

Spend's detailed breakdown reconciled with Home: RM494.08 owed less RM441.35 to receive equals RM52.73 net payable. Home's gross bill cards did not explain this difference clearly, so the source now includes a short explanation and a link to net settlement. Bill-specific payment controls are retained. A long internal Geoapify place identifier appeared in a live meal card; read-only note displays now hide import metadata while stored notes and coordinates remain unchanged.

No real trip, expense, payment or database content was changed. No credentials were read. The source changes in this package have not been deployed; the live observations describe the existing deployment.

To finish the remaining evidence: use two designated test accounts and a disposable trip for payment testing; a separate test database/branch for integration and restore testing; and a real iPhone for installed-PWA keyboard, offline/reconnect and update checks. First-time-user usability also requires observing a person complete the three tasks without guidance. The provisional 7.5/10 score is not raised merely because more unit tests pass.
