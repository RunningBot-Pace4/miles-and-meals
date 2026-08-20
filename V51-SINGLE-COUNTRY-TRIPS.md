# Miles & Meals v51 — Single-Country Trips + Admin-Only Delete

## 1. One trip = one country

A destination country is now required when a traveler creates a trip.

After creation, Trip Owner sees the country as read-only:

```text
DESTINATION COUNTRY                         Locked
Malaysia

This country was selected when the trip was created and cannot be changed or replaced.
```

There is no `+ Add destination`, country queue or multi-country batch action.

## 2. What Trip Owner can still manage

Trip Owner can still update:

- trip name
- start/end dates
- the destination's default FX rate
- which travelers can access the destination

Trip Owner cannot change the trip base currency or destination country.

## 3. Server-side enforcement

The UI is not the security boundary. v51 also blocks extra countries in the API:

- `POST /api/trips/[id]/countries` rejects owner attempts after creation.
- `POST /api/trips/[id]/countries/bulk` rejects multi-country requests.
- `POST /api/admin/countries` rejects a second country for the same trip.
- `POST /api/trips` requires a destination and creates the trip + country together.

The Admin country endpoint is retained only so a System Admin can repair an old
trip that was created without a destination before v51.

## 4. Trip deletion

The v50 delete protection remains unchanged:

- Trip Owners have no delete control.
- Only System Admin can call the delete API.
- Admin must type the exact trip name and confirm again.

## 5. Legacy multi-country trips

No country is deleted automatically during upgrade. If an older trip already
contains multiple countries, the Trip Owner page warns about the legacy state
and blocks adding more. A System Admin should decide which historical data to
retain before any manual cleanup.

## Database migration

No new table or column is required for v51. Do not reset Neon.

Recommended validation:

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
