# Miles & Meals v26 — Admin Users, Country Catalog, Daily FX

## Admin users

The Admin page now shows every user with:

- Name
- Email
- Role
- Account created time
- Login stamp
- Current session status
- Assigned trip/countries

Login history is stored in the new `login_audits` table whenever Better Auth
creates a session. Existing active sessions are used as a fallback until each
traveler signs in again after this release.

## Configured country list

The Admin page also shows every configured country with:

- Trip
- Country
- Country code
- Currency
- Trip base currency
- Stored default FX
- FX rate date/provider
- Number of assigned travelers

## Add Country

`Add country` now uses a selectable catalog with 248 countries/territories.

Selecting a country automatically fills:

- Country name
- ISO-style country code
- Currency code

Selecting a trip + country automatically loads:

```text
1 country currency = X trip base currency
```

For example:

```text
1 VND = X MYR
```

The app tries the free Frankfurter daily rate first. If that pair/provider is
unavailable, it falls back to the free Currency API endpoints. No API key is
required.

The server fetches the daily FX again when the country is saved. If all free
providers are unavailable, the manually entered fallback rate is used.

## GPS note

The GPS/background-tracking note was removed from:

- Location
- More

## Database migration

v26 adds:

```text
login_audits
countries.fx_rate_date
countries.fx_rate_provider
```

Run:

```powershell
npm install
npm run db:push
npm test
npm run build
npm run dev
```

Do not reset the database.
