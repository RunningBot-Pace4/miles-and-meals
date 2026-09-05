# Miles & Meals v49 — Active Trip Sync

## 1. Home trip selection is now global

The Trip selector on Home is now the single travel context for the normal
travel workspace.

When a traveler changes the trip on Home:

```text
Home
→ choose trip
→ /api/active-trip
→ validated same-site active-trip cookie
→ Home reloads
```

The server validates that the signed-in traveler has country access inside the
selected trip before saving it.

The cookie is:

```text
HttpOnly
SameSite=Lax
Secure in production
Path=/
```

A stale or manually changed cookie cannot grant access. Every read is validated
against current country assignments.

If the cookie points to a trip the traveler can no longer access, Miles & Meals
falls back to the first currently accessible trip.

## 2. Pages that now follow the active trip

The Home-selected trip now scopes:

- Home dashboard
- Expenses
- Add Expense
- Edit Expense
- Planner
- Planner live polling
- Location
- Location APIs
- Settle Up
- Settlement live polling
- Activity
- User Export
- Personal-budget onboarding

Account, Notification, My Trips, Personal Budget settings and System Admin
screens remain control/settings areas and are not unnecessarily hidden by the
travel context.

## 3. Planner can no longer switch to another trip

Planner receives only countries belonging to the active trip.

The add/edit Country dropdown therefore contains only destinations in the
current trip.

The planner filter now says:

```text
All destinations in this trip
```

Instead of:

```text
All my countries
```

Country options display only the destination name because the trip is already
fixed globally.

The Planner API also validates active-trip country membership, so a forged
request cannot create/edit/delete a planner item in another trip without
switching the active trip first.

## 4. Expenses sync to the active trip

Expenses list and 8-second live polling use only the active trip.

New Expense receives only active-trip countries.

Expense edit rejects an expense outside the active trip.

Expense create/update/delete APIs also validate that the country belongs to the
active trip.

## 5. Location sync

Location only receives active-trip destinations.

The GPS read/write APIs reject a country outside the active trip.

Within a multi-country trip, travelers can still choose the destination country
for location sharing.

## 6. Settlement sync

Settle Up now works inside the active trip only.

The optional filter is destination-level:

```text
All destinations
Malaysia
Singapore
Thailand
```

It no longer provides an `All trips` choice.

The existing 4-second settlement live refresh remains unchanged.

Settlement mutation APIs are also active-trip scoped.

## 7. Budget onboarding sync

Previously, a missing personal budget in any assigned trip could trigger the
budget gate.

v49 gates only the currently active trip.

Example:

```text
Vietnam Trip     budget already set
Japan Trip       budget not set
```

If Vietnam is active, the traveler can continue working normally.

When Japan becomes active, Miles & Meals asks for the Japan personal budget.

## 8. Trip Owner country dropdown

Existing and queued destinations remain visible in the Add Destination
Countries dropdown, but cannot be selected again.

Example:

```text
Malaysia · Added       disabled
Singapore              selectable
Thailand · Queued      disabled
Vietnam                selectable
```

This keeps the complete country list understandable while preventing duplicate
country selection.

The server-side duplicate-country checks remain active too.

## 9. Create Trip wording

Changed:

```text
First destination
```

to:

```text
Destination
```

`Add later` remains available.

## 10. Existing v48 behavior retained

v49 keeps:

- notification detail dialog / mobile bottom sheet
- optional Open related screen
- multi-country Trip Owner batch add
- collapsed destination cards
- project-wide numeric input guard
- non-admin email privacy
- personal + combined budgets
- expense/planner draft recovery
- settlement in-place refresh
- full travel backup/restore
- receipt OCR confidence

## Database migration

No database migration is required for v49.

The active trip uses a validated browser cookie rather than adding another Neon
table.

If the v46 `trip_budgets` table has already been pushed, do not run `db:push`
for v49.

If upgrading from before v46, run the required historical schema push once.

Never use `db:reset` for an upgrade.

## Validation completed

```text
PWA validation                 PASS
Navigation validation          PASS
Phase 8 / v49                  PASS
Service worker syntax          PASS
Validator syntax               PASS

174 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports

Active-trip persistence        PASS
Planner active-trip scope      PASS
Expenses active-trip scope     PASS
Location active-trip scope     PASS
Settlement active-trip scope   PASS
Added/queued country disabled  PASS
Destination wording            PASS

Numeric regression             PASS
Budget regression              PASS
Trip Owner regression          PASS
Settlement regression          PASS
Receipt OCR regression         PASS
```

A full Next production build still requires the installed project dependencies.

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
