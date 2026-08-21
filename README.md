# Miles & Meals

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
