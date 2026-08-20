# Miles & Meals

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
- Admin trip creation and multi-country setup
- Admin country assignment
- Normal users only see assigned-country data
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
