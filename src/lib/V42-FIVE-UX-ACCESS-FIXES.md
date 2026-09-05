# Miles & Meals v42 — Five UX & Access Fixes

## 1. PWA update prompt: installed mobile app only

The service worker still registers on normal web pages so the PWA can be
installed and updated, but the visible:

`Miles & Meals update ready → Update`

prompt is shown only when Miles & Meals is running as an installed standalone
mobile app.

Normal desktop/browser tabs do not show the prompt.

The service-worker cache version is bumped to:

`miles-meals-static-v42`

## 2. Country assignment moved into Travel Crew

The old Admin form:

`Assign person to country`

has been removed.

New flow:

1. Admin → Travel Crew
2. Open a user
3. Open `Manage country access`
4. Tick or untick countries
5. The change saves immediately

Every checkbox is labeled:

`Trip Name · Country`

so countries with the same name in different trips stay distinguishable.

## 3. Admin does not automatically see trip data

Admin is now an account/tool role only.

Admin still has access to:

- Admin
- Admin health
- User management
- Trip setup
- Country setup

But Home, Expenses, Planner, Location, Settlements, Export, live refresh and
other travel data require explicit country assignment through `country_members`.

An Admin with zero assigned countries sees no trip data until their own account
is ticked for at least one country.

## 4. Manual FX rate always wins

Add Country behavior:

1. Choose Trip
2. Choose Country
3. Daily FX auto-loads into the field
4. If Admin edits the FX field, the pending automatic request is cancelled
5. `Manual override` is shown
6. The exact submitted rate is stored

The server no longer performs a second FX fetch during country creation, so it
cannot overwrite the value entered by the Admin.

## 5. Trip name shown in country selectors

Country selectors now use:

`Trip Name · Country`

in:

- Expense Add/Edit
- Planner
- Live Location
- Settlements

This avoids duplicate-looking entries such as:

`Vietnam`
`Vietnam`

when the same country exists in two different trips.

## Database

No schema migration is required for v42.

## Validation

- PWA validation
- Navigation reliability validation
- Phase 8 + v42 regression validation
- Service-worker syntax
- TypeScript syntax/parse scan
- Nullability scan
- Local import resolution

## Build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```
