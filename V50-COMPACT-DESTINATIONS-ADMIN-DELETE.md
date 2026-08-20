# Miles & Meals v50 — Compact Destinations + Admin-Only Trip Delete

## 1. Trip Owner destination management

The Trip Owner card no longer presents a large `Add destination countries`
section as the main content after a trip already has a destination.

New layout:

```text
TRIP OWNER
Temerloh

Edit trip details

DESTINATIONS                         [+ Add destination]
1 destination

Malaysia
MYR → MYR · FX 1.0000000000
1 traveler · Manage
```

Existing destinations are now the primary content.

The add-country editor is hidden by default whenever the trip already has at
least one destination.

Selecting `+ Add destination` opens:

```text
Add another destination

Country
FX
Add to list

Ready to add
...
Add N countries
```

The v48/v49 multi-country queue remains available.

For a trip with no destination yet, the add editor opens automatically.

## 2. Existing destination cards stay collapsed

Destination cards remain collapsed until the Trip Owner chooses `Manage`.

This keeps multi-country trips compact.

## 3. System Admin-only trip deletion

Trip Owners do not receive any trip-delete control.

Permanent trip deletion is available only in:

```text
Admin
→ Configured trips
→ Edit/Delete area
→ Delete trip
```

The API independently enforces `isSystemAdmin`, so hiding the button is not the
security boundary.

Deletion requires:

1. open the Admin danger zone
2. type the exact trip name
3. click `Delete trip permanently`
4. confirm the browser warning

The server verifies the exact trip name again.

## 4. What a trip deletion removes

Deleting the trip removes travel data linked through the existing PostgreSQL
foreign-key cascade relationships, including:

- trip memberships
- personal trip budgets
- countries
- country assignments
- expenses
- expense splits
- settlements
- planner items
- location history
- country-linked notifications
- trip/country activity rows

It does not delete:

- users
- passwords/accounts
- sessions for unrelated trips
- login audits
- user preferences
- notification preferences
- push subscriptions

After deletion, an old active-trip cookie cannot restore access. The existing
v49 active-trip validation automatically falls back to another accessible trip.

## 5. Same-name trips

Admin no longer hides duplicate trip names.

Different travel groups may legitimately have trips with the same name, so
System Admin now sees every trip when managing or deleting trips.

## Database migration

No new database table or column is added in v50.

If the v46 `trip_budgets` migration is already applied, do not run `db:push`
for v50.

Never use `db:reset` for an upgrade.

## Validation completed

```text
PWA validation                 PASS
Navigation validation          PASS
Phase 8 / v50                  PASS
Service worker syntax          PASS
Validator syntax               PASS

174 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 v50 non-module diagnostics
0 missing local imports

Trip Owner compact editor      PASS
Trip Owner delete absent       PASS
Admin delete UI                PASS
Admin delete API role guard    PASS
Exact-name confirmation        PASS

Numeric regression             PASS
Budget regression              PASS
Trip Owner regression          PASS
Settlement regression          PASS
Receipt OCR regression         PASS
```

A full Next.js production build still requires installed project dependencies.

Recommended local/Vercel validation:

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
