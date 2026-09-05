# Miles & Meals v46 — Trip Owner + Personal Budgets + Notification Bell

## What changed

v46 removes the dependency on a System Admin for normal trip creation.

A normal signed-in traveler can now:

1. create a trip
2. automatically become Trip Owner
3. add destination countries
4. use the free daily FX reference rate
5. manually override the FX rate
6. edit country FX later
7. tick travelers into each country
8. set their own personal trip budget
9. use the normal travel workspace

System Admin remains available as a global recovery and maintenance role.

## Access roles

### System Admin

System Admin controls:

- global users
- user type
- disable/reactivate
- all Admin trip maintenance
- app health
- full backup/restore

System Admin still does not receive trip travel data merely because the account
is Admin. Country assignment remains required for travel data.

### Trip Owner

The creator of a trip gets:

```text
trip_members.role = OWNER
```

Trip Owner can manage only trips they own:

- trip name
- start/end dates
- destination countries
- country FX
- traveler assignment for those destinations

Legacy trip membership role `ADMIN` is also accepted as a Trip Owner manager
role so older records remain compatible.

### Traveler

Travelers use:

- Home
- Expenses
- Planner
- Location
- Settlements
- Notifications
- Export

Their visible travel data continues to be determined by explicit country
assignment.

## Self-service trip flow

New page:

```text
More
→ Create & manage my trips
```

or:

```text
Account menu
→ My trips
```

Flow:

```text
Create trip
    ↓
Creator = Trip Owner
    ↓
Add country
    ↓
Trip Owner is automatically assigned to that new country
    ↓
Tick additional travelers
    ↓
Each newly assigned traveler sets their own trip budget
    ↓
Travel workspace opens
```

No System Admin action is required.

## Personal budget architecture

New Neon table:

```text
trip_budgets
```

Key:

```text
trip_id + user_id
```

Fields:

```text
amount
created_at
updated_at
```

All personal budgets use the trip's base currency.

The old `trips.budget` column is retained for backward compatibility only.
New UI no longer asks Admin/Trip Owner for one global trip budget.

## Required budget onboarding

When a traveler has country access to a trip but no personal budget, travel
areas redirect to:

```text
/onboarding/budget
```

The traveler sees:

```text
YOUR TRAVEL WALLET
Set your trip budget

Vietnam 2027
MYR [ 5000.00 ]

[ Start my trip ]
```

Budget onboarding blocks travel data areas such as:

- Home
- Expenses
- Planner
- Location
- Settlements
- Activity
- Export

Control/account areas remain available:

- My Trips
- More
- Notifications
- Settings
- System Admin

This prevents a missing budget from locking someone out of account or trip
management tools.

Budget input also has local draft recovery.

## Draft recovery count

v46 now has three user-facing draft recovery areas:

```text
1. Expenses
2. Planner
3. Personal Budget
```

## Home budget design

Home now uses a real Trip selector instead of using a country ID while only
showing the trip name.

Home always works within one selected trip, avoiding incorrect sums between
trips that use different base currencies.

### MY TRAVEL WALLET

```text
My budget
My share spent
My remaining
```

Formula:

```text
My remaining
=
My budget
-
My personal expense share
```

### GROUP TRIP

```text
Combined budget
Trip expenses
Group remaining
```

Formula:

```text
Combined budget
=
sum of submitted traveler personal budgets
```

```text
Group remaining
=
Combined budget
-
Trip expenses
```

The screen also shows:

```text
2/3 budgets set
```

so the group can immediately see whether somebody has not entered a personal
budget yet.

The combined budget is based on travelers within destinations the signed-in
user can access. This preserves the existing country-access boundary.

## Notification bell

The top-right app header now contains a notification bell.

Examples:

```text
🔔
```

or:

```text
🔔 3
```

Behavior:

```text
Bell tap
→ /notifications
```

No popup/dropdown is used.

The bell:

- loads the initial unread count server-side
- refreshes every 15 seconds while active
- refreshes on focus
- updates immediately after Mark Read / Mark All Read
- displays `99+` above 99 unread notifications

## Notification Center

The v45 Notification Center remains unchanged functionally.

The bell is now the fast entry point to:

```text
Payment
Expense
Planner
```

notifications.

## FX behavior for Trip Owners

When adding a country:

1. choose country
2. local currency is filled automatically
3. daily FX is fetched using the existing free FX providers
4. the value is editable
5. manually typing changes provider to `Manual override`
6. manual value is sent to the server exactly as entered

Trip Owners can also edit an existing country's default FX later.

Existing expense records retain their historical stored FX.

## Admin trip setup

System Admin can still create trips.

New Admin-created trips also use:

```text
OWNER
```

for the creator's trip membership.

The obsolete Total Budget field has been removed from Admin trip creation and
editing UI.

Personal traveler budgets now determine the group budget.

## Backup / restore

Admin full travel backup now includes:

```text
trip_budgets
```

v46 restore remains backward-compatible with older v45 backup JSON that does
not contain personal budgets.

Login/authentication data is still excluded and preserved:

```text
user
session
account
verification
login_audits
user_preferences
notification_preferences
push_subscriptions
```

## User export

A normal user JSON/CSV export now includes only that signed-in user's own
personal trip budget.

Other travelers' personal budget records are not exposed through normal user
export.

## Database consistency

Duplicate trip names are no longer considered a consistency error because
independent Trip Owners are allowed to create similarly named trips.

Existing expense/split/country/trip consistency checks remain.

## Database migration

v46 adds:

```text
trip_budgets
```

If v45 has already been migrated, run once:

```powershell
npm run db:push
```

If v45 has not yet been migrated, the same command will also create the v45
notification/performance tables.

Do not use:

```text
npm run db:reset
```

## Upgrade

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

npm install

npm run db:push

npm run cleanup:legacy
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```

## Validation completed

```text
PWA validation                       PASS
Navigation validation                PASS
Phase 8 / v46 validation             PASS
Service worker syntax                PASS
Phase 8 validator syntax             PASS

168 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
0 v46 non-module diagnostics

Pure module compile                   PASS
Personal budgets 5000+3500+4000      12500 PASS
JY personal remaining                3720 PASS
Group remaining                      7900 PASS
Trip OWNER/legacy ADMIN role test     PASS
JY/Test/Huahua settlement regression PASS
Receipt OCR confidence regression    PASS
```

A full Next.js production build requires installed project dependencies.
Run `npm install`, `npm test` and `npm run build` locally or in Vercel.
