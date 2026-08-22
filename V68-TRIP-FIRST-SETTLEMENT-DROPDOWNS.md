# v68 — Trip-first Settle Up & Dropdown Audit

## Why
The Settle Up page was still using a legacy country/destination filter. With the one-trip-one-country model this was ambiguous: users could see “All destinations” or “Malaysia” but could not immediately tell which trip’s financial checkpoint they were about to lock.

## Changes
- Settle Up now defaults to the current active trip and uses **Trip Name** as the selector.
- Selecting **View trip** also syncs that trip as the app active trip, so Expenses, Plan, Add Expense and other active-trip pages stay aligned.
- Removed **All destinations** and **Trip / country** from the settlement screen.
- Each trip option includes a readiness cue: **Upcoming**, **In progress**, **Ready to lock**, or **Locked · vN**.
- A selected-trip context card shows trip name, destination, dates, base currency, and readiness before the financial checkpoint.
- The Financial Checkpoint heading now explicitly includes the trip name.
- Settlement summary/actions can safely work with any trip/country the signed-in traveler is assigned to, even when it is not the current active-trip cookie.
- Settlement rows and Smart Settlement labels now use the **trip name** instead of only the country name.
- Settlement/payment notifications deep-link back to the correct trip.
- Live GPS now uses a **Trip** dropdown with trip names. The destination country remains visible as supporting context below the selector.
- User-facing trip selectors were audited: Home, Plan, Add Expense, Settle Up, Trip Wrapped, Live GPS, and Admin trip pickers show trip names. Genuine destination-country selectors remain country-based by design.

## Ready to lock
For consistency with Home, an open trip is marked **Ready to lock** once its end date is at least one day in the past (Malaysia date boundary). This is a recommendation only; the Trip Owner still decides when everyone has finished entering expenses.

## Database
No schema change from v67 to v68. `npm run db:push` is not required specifically for v68 if the v67 schema is already applied.
