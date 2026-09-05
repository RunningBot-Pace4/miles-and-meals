# Miles & Meals v47 — Numeric Input, Trip Setup and Privacy Fixes

## 1. Numeric-only money/rate fields

All current project fields marked as decimal/numeric now use the global
`NumericInputGuard`.

Examples covered:

- personal budget
- expense amount
- exchange rate
- actual card charge
- split values
- planner estimated cost
- planner quantity
- Admin country FX
- Trip Owner country FX

Alphabetic characters and unrelated symbols are blocked/removed.

Allowed entry characters:

```text
0-9
.
,
```

Negative signs are intentionally rejected because the current amount, FX,
quantity and budget fields are positive-only.

Server-side validation remains in place as the final security boundary.

## 2. Personal budget note removed

Removed:

```text
Your personal target
The group dashboard uses the combined total...
```

The Personal Budget screen now stays focused on entering and saving the budget.

## 3. Configured Countries header

Admin:

```text
Destinations
→ Configured countries
```

The country card heading now displays the Trip Name only.

The country code/currency/FX information remains available in the card.

## 4. Create Trip can add the first country directly

`Create a new trip` now contains:

```text
Trip name
Base currency
First destination
Start
End
```

When First destination is selected:

- country currency is filled automatically
- free daily FX is loaded
- Trip Owner can manually override the FX value
- creating the trip also creates that destination
- creator is automatically assigned to the new country

The API validates the selected country and rolls back a partially-created trip
if the first-destination creation fails.

A traveler can still choose `Add later`.

## 5. Country controls no longer look missing after add

Trip Owner destination cards now open by default.

Immediately after adding a country the owner can see:

- default FX edit
- traveler tick list

The summary also says:

```text
<n> travelers · Manage
```

so it is clear where those controls are.

## 6. Email privacy

Normal travelers and Trip Owners now receive only traveler names.

Normal travel APIs no longer return:

```text
user.email
```

for country members.

The My Trips server query has two modes:

```text
System Admin    → name + email
Normal user     → name only
```

The non-admin HTML/React payload therefore never receives another user's email.

Users can still see their own login email in their own Account/Profile areas.

## Database

v47 adds no database tables or columns.

If v46 `trip_budgets` has already been pushed, no DB migration is needed.

If upgrading from before v46, run:

```powershell
npm run db:push
```

Never use `db:reset`.

## Validation

```text
PWA validation             PASS
Navigation validation      PASS
Phase 8 / v47              PASS
Service worker syntax      PASS
Validator syntax           PASS

171 TS/TSX files
0 syntax errors
0 nullability errors
0 missing local imports

Numeric-input regression   PASS
Budget regression          PASS
Trip Owner regression      PASS
Settlement regression      PASS
Receipt OCR regression     PASS
Email privacy audit        PASS
```

## Upgrade/build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

npm install
npm run cleanup:legacy
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```

If v46's schema has not yet been pushed:

```powershell
npm run db:push
```
