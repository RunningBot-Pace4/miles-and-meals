# Miles & Meals v57 — Home View All in Trip Dropdown

## Home trip selector

Home now uses one trip dropdown for both modes:

- `View all trips`
- each accessible trip name

The separate `Your travel overview` block heading is removed.

## View all trips

Selecting `View all trips` opens `/dashboard?view=all` without replacing the user's active-trip cookie.
This keeps Plan/Add Expense tied to the last explicitly selected trip while Home is temporarily in all-trip mode.

In all-trip mode:

- the hero says `All trips`
- the wallet card for one trip is hidden
- the trip summary cards are shown without a separate overview heading
- each card can be opened to make that trip the active trip
- trip-specific finance, settlement and shortcut panels are hidden until a trip is selected

## Specific trip

Selecting a trip updates `/api/active-trip`, returns to `/dashboard`, and restores the normal trip-specific Home dashboard.

No database migration is required for v57.
