# V92 Living Journey — complete approved light design

Version `1.92.0` applies the approved light Living Journey system across the full Miles & Meals PWA and PC experience. The interactive four-mode Halo remains data-driven for active Trips and explanatory before the first Trip exists. Plan, Map, expenses, receipts, settlement, documents, offline, Companion, people, memories, notifications, settings and administration now share the same calm white canvas, compact hierarchy and connected interaction language.

Start with `START-HERE-V92.md`, then review `V92-LIVING-JOURNEY-DESIGN.md`. The V90 market-evidence boundary remains documented in `V90-COMBINED-WORLD-CLASS-TARGET.md`.

V92 has no new database migration. Existing deployments must already have the V85 and V90 migrations applied.

---

# V85 Combined — V83, V84 and V85

V85 combines the next three phases into one release and makes every product scorecard area a **10/10 acceptance target**.

- Trip Command Centre with stage, next plan, today summary, daily allowance and forecast.
- Sync Centre with original Trip/currency/sharing context, history and actionable retry states.
- Ordered day planning, Tasks, Packing, routes, calendar export and reviewed confirmation import.
- Multiple expense payers, weighted shares, saved split presets and expense comments.
- Category budgets, receipt review queue and partial settlement payments.
- Final mobile/PWA containment plus authenticated audits at 320–430 px.
- Neon migration, backup/export/reset coverage and a dedicated V85 release validator.

Trip Inbox and flight-number guessing stay removed. See `V85-COMBINED-10-POINT-RELEASE.md` and run the non-destructive `neon-upgrade-v85-combined.sql` before deployment.

---

# v82.2 — Offline Sharing, Silent Refresh & Mobile Navigation

v82.2 completes the offline and phone-layout follow-up:

- closed Trips are filtered by the server, app screen, local cache and standalone offline shell;
- offline Quick Expense defaults to Everyone but supports Only me or a custom traveler selection;
- successful background sync immediately refreshes the live Home wallet and Settlement data without a loading page;
- the mobile navigation is portalled directly to the document body and remains fixed to the viewport while long pages scroll;
- the PWA cache is bumped so devices receive the new offline shell and layout rules.

See `V82.2-OFFLINE-SHARING-MOBILE-REFRESH.md`.

---

# v82.1 — Vercel Overlay Build Hotfix

v82.1 removes retired Trip Inbox / flight files during `prebuild`. This supports deployments where the full-source ZIP is extracted over an older checkout, which replaces changed files but otherwise leaves deleted routes behind.

The cleanup runs before v82 validation and Next.js route discovery, so stale `/inbox`, `/api/trip-inbox` and `/api/flight-lookup` sources cannot reappear or break the Vercel build.

---

# v82 — Offline Sync Recovery & Inbox Removal

v82 fixes the reconnection retry loop and removes the unused Trip Inbox / booking-reservation workflow.

- Offline Expense and Plan changes sync to the Trip stored with each queued mutation, even if another Trip is active after reconnection.
- Closed Trips and other permanent 4xx failures stop after one attempt and are shown as action-required instead of retrying forever.
- Generic `Forbidden` errors are replaced with clear Trip-access guidance; valid accessible Trips are no longer rejected merely because they are not active.
- An older queued item already stuck on raw `Forbidden` gets one recovery retry after v82 loads.
- Trip Inbox, booking import/live lookup, the Planner Bookings tab, offline Reservations and the PWA Inbox shortcut are removed.
- The Add Expense sentence about financially locked Trips being hidden is removed.
- No database migration is required; legacy Inbox rows remain only for backup compatibility.

See `V82-OFFLINE-SYNC-INBOX-REMOVAL.md`.

---

# v81 — Flight Accuracy, Closed Trips, Offline All-Trips & Mobile QA

v81 is the requested whole-function and whole-layout reliability pass on top of v80.

- Booking imports now prefer the **departure** section and ignore earlier booking-created, issued, payment and email timestamps. Month-name dates and 12-hour times are normalized safely.
- A flight number is never treated as unique by itself. Users choose a flight date, and an optional server-side Aviationstack lookup accepts only the exact flight-number/date result while preserving airport-local scheduled times.
- Closing a Trip now makes the full Trip read-only across details/dates/FX, travelers, invites, budgets, Plan, Trip Inbox, expenses, Journey membership changes and live-location writes. Historical viewing, settlement calculations and repayment confirmation remain available; reopening restores writes.
- Every accessible Trip is refreshed into private device storage while online. The standalone offline screen can choose among Trips and carries the original Trip ID, country, destination currency and base currency into the queued change.
- The mobile/PWA containment audit now includes all visible form controls plus the standalone offline shell at 320, 390 and 430px. Date inputs and two-column grids collapse before they can overflow.
- No database schema change is introduced by v81.

For live flight retrieval, set the server-only `AVIATIONSTACK_API_KEY`. The provider plan must support the dates/features you use; without a key or an exact match, the UI keeps manual/uploaded details and explains the limitation.

See `V81-FLIGHT-CLOSED-OFFLINE-MOBILE.md`.

---

# v80 — Locked Trips, Journey Results & Offline 3.0

v80 completes the workflow and PWA audit on top of v79.

- Financially closed Trips are hidden from Add Expense; open Trips remain available and are labeled `Trip · Destination`.
- Invite links and their QR codes now have one enforced **12-hour** validity window, including an expiry time in the UI.
- Multi-country Journey now has a dedicated **View Journey** route overview with ordered stops and direct Trip opening.
- Offline packs support multiple Trips, explicit Trip/currency selection and correct Trip-bound resync after reconnect.
- Reconnection forces an immediate safe retry, while validation/conflict failures remain reviewable.
- The full 42-day calendar is contained in normal form flow, and the PWA worker activates v80 immediately to replace stale cached CSS.
- No database schema change is introduced by v80.

See `V80-LOCKED-TRIPS-JOURNEYS-OFFLINE.md`.

---

# v79 — Full UX, Responsive and Reliability Audit

v79 is a complete design/function audit on top of v78.

- The Start → End calendar now expands **inside the form**, displays all 42 day cells, shows full date values and can never cover the Create/Save button.
- Forms, cards, grids, dialogs and controls have a final global containment layer for phone, tablet, desktop and browser-zoom layouts.
- Long native dropdown choices are compacted for mobile while the full original label remains available as the option title and stored value.
- A deliberate **Sync pending** tap now retries immediately; automatic background sync keeps its safe backoff behavior.
- Vitest now resolves the `@/` source alias and excludes Playwright files, so `npm test` is a valid unit-test gate.
- Browser checks now verify control bounding boxes, 42 visible calendar cells, calendar/submit non-overlap, long-option limits and 320–960px containment.
- No database schema change is introduced by v79.

See `V79-UX-RESPONSIVE-AUDIT.md` for the audited screen/function matrix and exact E2E instructions.

---

# v78 — Trip Switching, Friendly Dates, Offline Resync & PWA Polish

v78 is the UX/reliability release on top of the complete v77 web/PWA source.

- **Settle Up** trip selection now opens immediately when the dropdown changes; the extra **View trip** button is removed.
- Trip/Journey dates now use one **two-tap range calendar**: first tap = Start, second tap = End, with the selected range highlighted.
- **Multi-country Journey** is explained as an optional folder for one holiday containing several single-country Trips; it never merges expenses or settlements.
- **Trip Inbox** distinguishes a public flight number from a private booking/PNR reference. It extracts details from uploaded/pasted confirmations but does not invent private reservation data or live status.
- **Offline resync** is serialized across sync controls, preserves newly queued work, uses backoff/review states, prevents silent queue overflow, and makes Planner create/update/delete retries idempotent after lost responses.
- Mobile/PWA coverage targets **320 / 360 / 375 / 390 / 412 / 430px**, safe-area insets, no horizontal overflow, touch-friendly controls and the installed PWA shell.
- No new database schema is introduced by v78. If the v77 schema is already applied, no extra `db:push` is required specifically for v78.

See `V78-TRIP-DATES-OFFLINE-PWA-POLISH.md`.

---

# v77 — Global Mobile-Web / PWA Enhancement Pack (v71–v77)

This source package combines the complete v71–v77 roadmap on top of the stable v70 baseline. It remains a **responsive mobile web + PWA** application; there is no separate native iOS/Android codebase.

- **v71 Invite & Onboarding** — secure expiring invite links, private local QR, Share Sheet/copy, invite-aware login/register, revoke support, and safe return-path handling.
- **v72 Journeys** — group multiple single-country Trips into one Journey without mixing their currencies or ledgers.
- **v73 Receipt Itemization** — assign receipt lines to travelers and reconcile tax/service/remaining cents exactly to the final trip-currency expense total.
- **v74 Trip Inbox** — review/import booking text, images, TXT/EML and best-effort text PDFs, then add a reservation to Plan with idempotent retry protection. Raw imported booking bodies are not stored.
- **v75 Offline 2.0** — save active-trip essentials locally and queue a Quick Expense while fully offline; private local data is cleared on sign-out.
- **v76 Settlement Payment UX** — copy/share/request a Smart Settlement amount without moving money or rewriting the ledger.
- **v77 Global Web/PWA Foundation** — regional locale/time-zone preferences, deep-link/PWA shortcuts and dedicated mobile layouts for the new tools.

### Database upgrade from v70

v77 adds tables/columns. **Back up Neon first**, then run:

```bash
npm install
npm run db:push
npm run release:check
npm run build
```

Do **not** run `db:reset` for an upgrade. `db:reset:keep-login` is a separate destructive maintenance tool and should only be used intentionally after a Neon backup/branch.

See `V71-INVITE-ONBOARDING.md` through `V77-GLOBAL-WEB-PWA.md` and `V77-FINAL-RELEASE-GATE.md`.

---

# v70 — Explainable Smart Settlement

- Every Smart Settlement recommendation now has **View details** with transparent payer/receiver net-position math.
- Added **Smart Settlement / Original Balances / History** audit views.
- Original Balances expands to the exact expense shares that created each traveler-to-traveler obligation.
- Recommended-transfer detail shows direct opposing balances when they exist, plus contributing expenses and recorded payments.
- Expense-level audit rows link back to the original expense.
- Whole-group netting is explained honestly instead of forcing an optimized transfer onto one arbitrary receipt.
- Existing Mark Paid / Mark Received / completed history behavior remains unchanged.
- No database migration is required from v69 to v70 (assuming the v67 schema is already applied).

See `V70-EXPLAINABLE-SMART-SETTLEMENT.md`.

# v69 — Mobile Flow, Navigation & Safe Neon Reset

- Added a context-aware mobile **Back** control on secondary screens while keeping the five main tabs clean.
- **Your travel story** trip selection now opens immediately; the extra View button is removed.
- Search no longer auto-focuses on mobile, preventing the keyboard from hiding the bottom navigation.
- Added a mobile-only design-system pass for 320–430px phones: larger touch targets, iOS-safe 16px inputs, premium bottom nav, safer spacing and clearer search/wrapped cards.
- Added authenticated multi-viewport E2E coverage for the full core mobile route flow.
- Added a guarded Neon reset that clears app/travel data while preserving Better Auth login accounts and security/profile state.
- No new database migration is required from v68 to v69 (assuming the v67 schema is already applied).

See `V69-MOBILE-FLOW-NAV-RESET.md`.

# v68 — Trip-first settlement dropdowns

Settle Up is now explicitly trip-scoped: the selector shows trip names and readiness, the financial checkpoint names the selected trip, and Live GPS also uses trip names instead of country-only labels. See `V68-TRIP-FIRST-SETTLEMENT-DROPDOWNS.md`.

# Miles & Meals — V90 Combined

Version `1.90.0` combines V86–V90: production-readiness evidence, traveler permissions, smart day routing, private/shared travel documents, emergency contacts, a fuller editable offline workflow, explainable Trip companion guidance, discovery and memories.

Start with `START-HERE-V90.md`, then review the honest target and external-proof boundary in `V90-COMBINED-WORLD-CLASS-TARGET.md`.

## v67 — Phase 9–14 Production Launch Candidate

- Phase 9–14 are consolidated into one production-quality release.
- New versioned **Financial checkpoint** lets a Trip Owner lock the expense ledger before final settlement and safely reopen it for corrections.
- Closed-trip snapshots keep totals, Smart Settlement plans and a checksum while leaving the existing repayment ledger unchanged.
- Expense writes are server-blocked while financials are closed; repayment confirmation still works normally.
- Added a ~5-second privacy-scoped collaboration pulse and existing stale-edit protection remains active.
- Added privacy-minimal aggregate product analytics plus System Admin **Product insights** for save reliability, errors, P95 and usage signals.
- Added keyboard/reduced-motion/mobile touch-target hardening and launch-candidate E2E coverage.
- Added CSP/security headers, financial snapshot health checks, backup compatibility and a safe staging load-smoke tool.
- Added `source:check`, `typecheck`, `release:check` and Phase 9–14 regression gates to the build pipeline.
- **Database migration is required from v66 to v67. Back up first, then run `npm run db:push`.**

See `V67-PHASE9-14-PRODUCTION-LAUNCH-CANDIDATE.md`.

## v66 — Smart Settlement + World-Class Trust Hardening

- New **Smart Settlement** report nets remaining group balances into fewer recommended transfers while keeping the existing ledger/payment flow unchanged.
- Normal travel groups use an exact minimum-transfer search; unusually large groups use a fast deterministic fallback.
- Settle Up shows the before/after transfer count, personal recommended moves, group plan and an expandable calculation explanation.
- Home surfaces **Smart settlement ready** after a trip has ended and outstanding balances remain.
- New-expense saves are idempotent across network retries and can recover an interrupted split save.
- Expense and Planner edits reject stale versions instead of silently overwriting another traveler’s newer change.
- Offline conflicts now become reviewable **needs attention** items with Retry/Discard controls instead of retrying forever.
- Settlement actions tolerate harmless repeated requests.
- Dashboard/settlement name queries are participant-scoped, and production security headers are enabled.
- Admin health checks cover impossible settlement states and confirmation inconsistencies.
- Smart Settlement/offline recovery receive mobile-first and accessibility polish.
- No database migration is required from v65.1 to v66.

See `V66-SMART-SETTLEMENT-WORLD-CLASS-HARDENING.md`.

## v65 — Add Expense Save Reliability

- Fixed mobile/PWA saves that could appear to do nothing when browser-native validation blocked React submit.
- Add Expense now uses one explicit validation path with visible, sticky feedback and first-field focus.
- Removed phantom draft creation caused by marking every form click as an edit.
- Possible duplicates auto-scroll into view instead of appearing off-screen.
- Added a 20-second save timeout and a double-submit guard.
- Successful saves clear draft state before navigation.
- Offline-queued expenses no longer recreate an unsaved draft after queueing.
- No database migration is required from v64 to v65.

See `V65-EXPENSE-SAVE-RELIABILITY.md`.

## v63 — Consolidated Mobile + Product Maturity Release

- Mobile Add Expense has been compacted and polished for phone use.
- Home adds a **Needs your attention** action centre and recent activity timeline.
- Receipt recognition adds date/category intelligence and API-backed duplicate-expense warnings.
- Planner items can open **Add expense** with trip/date/description/category prefilled.
- New **Search trips** searches expenses, plans and activity across accessible trips.
- Supported expense/planner mutations can queue offline and sync after connection returns.
- New **Trip Wrapped** provides a post-trip spending/planning summary.
- Existing JSON/CSV export plus Admin backup/restore remain the recovery layer.
- v59-v63 are delivered together in this source package.
- No database migration is required from v58 to v63.

See `V59-HOME-ACTION-ACTIVITY.md` through `V63-TRIP-WRAPPED-MOBILE.md`.

## v58 — Home Defaults to View All, Same Dashboard Screen

- Home now defaults to **View all trips** whenever the traveler has at least one accessible trip.
- View All no longer opens a separate trip-card overview; it uses the exact same Home dashboard layout as an individual trip.
- The hero wallet, personal/group budgets, spending categories and settlement panels aggregate all accessible trips.
- Choosing a specific trip switches the active trip and shows the same dashboard filtered to that trip.
- Returning to the normal `/dashboard` route defaults Home back to **View all trips** without clearing the active trip used by Plan/Add Expense.
- When trip base currencies differ, all-trip totals are normalized into the active wallet currency using the existing daily FX service.
- No database migration is required from v57 to v58.

See `V58-HOME-DEFAULT-ALL-SAME-SCREEN.md`.

## v56 — Owner Row + Live Budget Prompt + Creator Assignment

- `Owner` stays on one line in Trip Travelers.
- Traveler assignment/removal now shows a proper blocking loading state.
- Newly assigned travelers are detected live (no manual refresh) and prompted to set a personal budget.
- Trip assignment also creates an in-app/push trip notification.
- Self-service trip creation verifies the creator as both Trip Owner and assigned traveler, including System Admin users.
- Newly created trips become the creator's active trip and open personal-budget setup.
- Existing creator records are self-healed when **Create & manage trips** is opened.
- No database migration is required from v55 to v56.

See `V56-OWNER-LIVE-BUDGET-ASSIGNMENT.md`.


## v55 — Currency Choice + Receipt OCR + All Trips Home

- Add Expense defaults to the trip currency but now offers a currency dropdown when another transaction currency is needed.
- Alternate currencies use the existing daily FX reference service, with Cash/Card/Manual overrides still available.
- Receipt OCR uses stronger image preparation, two total-area passes, next-line TOTAL detection and safer candidate ranking.
- Home keeps one active trip and adds an **All Trips** overview for travelers with multiple accessible trips.
- No database migration is required from v54 to v55.

See `V55-CURRENCY-OCR-ALL-TRIPS-HOME.md`.


## v54 — Completed Payment Lock + Trip Traveler Permissions

- Completed settlements are history-only and shown as **Completed · View only**.
- Trip Owners can assign/remove travelers on trips they own.
- Trip and one-country membership stay synchronized when access changes.
- The Trip Owner cannot be removed from their own trip.
- System Admin can view traveler name + email; Trip Owners receive name-only assignment data; regular travelers do not receive the global assignment directory.

See `V54-SETTLEMENT-LOCK-TRIP-TRAVELERS.md`.


## v53 — Settlement + Notification Reliability

- Receiver confirmation completes both payer and receiver settlement status.
- In-app notifications remain available even without Web Push.
- Restored complete PWA assets required by the service worker.
- Push setup checks the current device and no longer waits indefinitely for a broken service worker.
- Notification bell/list refresh every 5 seconds.

See `V53-SETTLEMENT-AUTO-NOTIFICATION-FIX.md`.

Travel together. Spend smarter.

Mobile-first travel tracker built with Next.js, Better Auth, Neon PostgreSQL,
Drizzle ORM and Vercel.

## v10 highlights

- Responsive mobile, tablet and desktop layout
- One-click Settle Up with no manual repayment amount
- Settlement status flow: Waiting → Payment sent → Received
- Receiver can directly mark an outstanding repayment as received
- Trip Crew dashboard: Paid · Personal Share · To Receive · To Pay
- Dedicated `/settlements` page with current status and received history
- Entire-trip expense overview with trip total and your personal share
- Mobile bottom navigation and desktop vertical sidebar
- Top-right account avatar menu and user profile colors/icons
- Forced private-password change after an Admin issues a temporary password
- Historical per-expense FX rates and Equal / Percentage / Exact splits
- Branded loading states for saves and payment-status actions

## Main features

- Email/password login and registration
- One active server-side session per account
- Self-service trip creation with one destination country per trip
- Trip Owner traveler assignment; System Admin recovery/maintenance controls
- Travelers only see data for trips they are assigned to
- Dashboard with budget, spending, person-level shares and settlement summaries
- Expense add/view/edit/delete
- Historical per-expense FX rates
- Equal / Percentage / Exact Amount splits
- One-click repayment tracking with server-calculated settlement amounts
- Itinerary / Places / Meals / Shopping / Bookings
- GPS location sharing with country-level authorization
- MapLibre member map

## Passwords

- Users can change their own password from the top-right avatar menu.
- Admin can reset another user's password from Admin.
- Forgot Password is Admin-assisted; no email provider/API key is required.
- Normal users can register at `/register`.

## Visual Studio 2026

Open this folder directly:

```text
File → Open → Folder
```

Then run:

```powershell
Copy-Item .env.example .env
npm install
npm run db:push
npm run seed:admin
npm run build
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"

BETTER_AUTH_SECRET="replace-with-a-new-random-secret-at-least-32-characters"

BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ADMIN_NAME="Travel Admin"
ADMIN_EMAIL="your-real-email@example.com"
ADMIN_PASSWORD="ChangeThisPassword123!"

RESET_DATABASE="NO"
```

For Vercel, change the two app URLs to your real production URL.

## Neon

`npm run db:push` creates/updates the required schema.

To intentionally clear all Miles & Meals data:

```powershell
$env:RESET_DATABASE="YES"
npm run db:reset
Remove-Item Env:RESET_DATABASE

npm run db:push
npm run seed:admin
```

This is destructive.

## Registration and access

A newly registered user is a normal user. Registration does not automatically
grant trip access.

Admin must:

1. Create a trip.
2. Add countries.
3. Assign users to countries.

Server-side authorization prevents normal users from reading data for
unassigned countries.

## Exchange rates

A country's exchange rate is only a default for new expenses. Every expense
stores the actual rate used for that transaction, so later changes to the
country default do not alter historical spending.

## GPS

Browser geolocation requires HTTPS and user permission. Vercel supplies HTTPS.
Continuous tracking while the app is fully suspended/closed is a mobile-browser
limitation and would require a native companion app later.

## Tests

```powershell
npm test
```


## v8 update

After upgrading from v7, run:

```powershell
npm run db:push
```

v8 adds `user_preferences` for avatar choices and the mandatory password-change
flag used after an Admin issues a temporary password. Existing trip data is kept.


## v10 settlement update

After upgrading from v9, run:

```powershell
npm run db:push
```

v10 adds the `settlements` table. A repayment is never typed manually. Miles &
Meals calculates the current amount from the expense ledger:

- `Waiting`: the debtor still needs to pay.
- `Payment sent`: the debtor clicked **Mark paid**.
- `Received`: the receiver clicked **Confirm received**.
- The receiver can also click **Mark received** directly if the money already
  arrived outside the app.

`SENT` and `SETTLED` repayments are applied to the ledger so the same balance is
not offered twice. Each country keeps its own settlement ledger.


## Phase 8 Free Edition

v38 adds mobile pull-to-refresh, connection-restored UX, live Expense/Planner
sync, unchanged automatic Settle Up refresh, PWA update prompts, VAPID Web
Push, notification preferences, activity history, JSON/CSV export, Admin health,
Neon client-error logging, same-origin mutation checks and Playwright E2E
coverage.

See `PHASE8-FREE-COMPLETE.md`.

This release adds database tables. Run:

```bash
npm install
npm run db:push
npm run phase8:check
npm test
npm run build
```

Optional Web Push setup:

```bash
npm run push:keys
```


## v45 Free Enhancement Pack

v45 adds in-place Expense/Planner/Home collaboration, local draft recovery,
test Web Push, an in-app Notification Center, Admin disable/reactivate controls,
Select All/Clear All country access, controlled travel backup/restore, database
consistency checks, free API performance diagnostics and field-level receipt OCR
confidence.

See `V45-FREE-ENHANCEMENT-PACK.md`.

This release adds `notifications` and `api_metrics`, so run:

```bash
npm install
npm run db:push
npm run phase8:check
npm test
npm run build
```

Do not use `db:reset`.


## v46 Trip Owner + Personal Budgets

v46 allows normal travelers to create and manage their own trips without a
System Admin. The trip creator becomes `OWNER`, can add countries and assign
travelers, while global Admin remains the maintenance/recovery role.

Budgets are now personal per traveler per trip. Home shows My Budget /
My Share / My Remaining and Combined Budget / Trip Expenses / Group Remaining.

A top-right notification bell shows unread Notification Center count.

v46 adds `trip_budgets`.

```bash
npm install
npm run db:push
npm run phase8:check
npm test
npm run build
```

Do not use `db:reset`.

See `V46-TRIP-OWNER-PERSONAL-BUDGETS-NOTIFICATION-BELL.md`.


## v47 Numeric Input + Trip Setup + Privacy

v47 blocks alphabetic entry in all current numeric amount/FX/share/quantity
fields, removes the Personal Budget explanation block, shows Trip Name only in
Admin Configured Countries, lets Trip Owner add a first destination directly
while creating a trip, opens country FX/member controls immediately after add,
and prevents non-admin travelers from receiving other users' email addresses.

No new v47 database migration is required beyond v46's `trip_budgets`.

See `V47-NUMERIC-COUNTRY-PRIVACY-FIXES.md`.


## v48 Notification Details + Multi-Country Trip Owner

v48 changes Notification Center to a detail-first flow: tap a notification to
open a dialog/mobile bottom sheet, then optionally open the related screen.

Trip Owners can queue multiple countries with individual FX values and add them
as one batch. Existing destination cards are collapsed by default to keep long
trips compact.

No new v48 database migration is required.

See `V48-NOTIFICATION-DETAILS-MULTI-COUNTRY-COLLAPSE.md`.


## v49 Active Trip Sync

The Home trip selector is now the global active travel context. Expenses,
Planner, Location, Settle Up, Activity and user Export follow that trip rather
than mixing data from all assigned trips.

Planner can only add/edit items inside the active trip. Existing/queued
countries remain visible but disabled in the Trip Owner destination selector.
`First destination` is renamed to `Destination`.

No new v49 database migration is required.

See `V49-ACTIVE-TRIP-SYNC.md`.


## v50 Compact Destinations + Admin-Only Trip Delete

Trip Owner cards now show existing destinations first. The add-destination
editor stays hidden until `+ Add destination` is selected, while multi-country
batch add remains available.

Permanent trip deletion is now available only to System Admin and requires
exact trip-name confirmation plus a second confirmation. Trip Owner pages do
not contain a delete control.

No new v50 database migration is required.

See `V50-COMPACT-DESTINATIONS-ADMIN-DELETE.md`.


## v51 Single-Country Trips + Admin-Only Delete

Each trip now has exactly one destination country. The destination is required
during self-service trip creation and becomes read-only immediately after the
trip is created. Trip Owners can still manage the destination FX rate and
traveler access, but they cannot add, replace or queue another country.

Owner country-add APIs and the old bulk-country endpoint now reject additional
destinations. The System Admin country endpoint also refuses a second country;
it remains available only to repair older trips that have no destination.

Trip deletion remains System Admin-only with exact trip-name confirmation and
a second confirmation.

No new database migration is required.

See `V51-SINGLE-COUNTRY-TRIPS.md`.


## v52 Trip Switcher UX

- Home-selected trip remains the default across the app.
- Planner and Add Expense can switch the active trip directly.
- Trip selectors show trip names rather than country names.
- Removed the extra locked-country explanatory sentence.
- Single-country enforcement and System Admin-only trip deletion remain in place.

See `V52-TRIP-SWITCHER-UX.md`.

## v57 Home selector

Home now puts `View all trips` inside the main Trip dropdown. The old always-visible `Your travel overview` section heading is removed. Selecting a specific trip restores the normal active-trip dashboard.

## v64 Advanced Money Input

Add Expense now uses an amount-first money card on mobile and desktop. The amount is visually dominant, the currency dropdown shows code + name, the trip default currency is clearly separated, and foreign-currency entries get an immediate conversion preview. Existing FX rate types and storage logic are unchanged. No database migration is required from v63.

See `V64-ADVANCED-MONEY-INPUT.md`.


## v65.1 build hotfix

Fixed strict TypeScript compilation in the Add Expense submit-problem focus helper (`RadioNodeList` handling). No database migration is required.
