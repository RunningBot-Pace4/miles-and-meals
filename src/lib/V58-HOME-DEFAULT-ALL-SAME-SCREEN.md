# Miles & Meals v58 — Home Defaults to View All on the Same Screen

## Requested behavior

Home now treats **View all trips** as the default display mode.

The layout does not switch to a separate all-trip page or card grid. The same Home dashboard is reused for both scopes:

```text
Trip
[ View all trips ▼ ]

Current Journey / Wallet
Personal budget
Combined travel budget
Spending by category
Settlement status
Travel shortcuts
```

Selecting a named trip keeps the same layout and simply filters those values to the selected trip.

## Default behavior

Opening:

```text
/dashboard
```

shows **View all trips** by default whenever the traveler has accessible trips.

Choosing a specific trip posts that trip to `/api/active-trip` and opens:

```text
/dashboard?view=trip
```

The specific trip becomes the active trip for Plan, Add Expense and the rest of the trip-scoped workspace.

Choosing **View all trips** returns to `/dashboard`. It changes only the Home display scope; it does not clear the active-trip cookie.

## All-trip aggregation

The Home View All mode aggregates:

- personal budget
- personal share spent
- personal remaining
- combined traveler budgets
- total trip expenses
- group remaining
- spending categories
- settlement balances and status

When accessible trips use different base currencies, all-trip values are normalized into the current active wallet currency using the existing daily FX service. FX rates are cached in the server process for a short period to avoid unnecessary repeated lookups.

## Removed

The previous separate `AllTripsOverview` component and its trip-card grid are no longer used.

## Database

No table or column changes are required.

Do **not** run `npm run db:push` only for v58 when upgrading from v57.
