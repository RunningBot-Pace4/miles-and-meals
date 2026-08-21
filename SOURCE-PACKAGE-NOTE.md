# Miles & Meals v58 — Full Source Package

This ZIP contains the complete v58 source tree based on v57.

Included v58 behavior:

- Home defaults to **View all trips**.
- The View All mode keeps the exact same dashboard structure used by an individual trip; the separate travel-overview card grid has been retired.
- The main wallet, personal budget, group budget, category spending and settlement sections aggregate all trips the user can access.
- Selecting a named trip from the Home dropdown makes that trip active and opens the same dashboard filtered to that trip.
- Selecting **View all trips** returns to `/dashboard` and does not overwrite the active-trip cookie used by Plan/Add Expense.
- Mixed trip base currencies are normalized for the all-trip dashboard through the existing daily FX service with a short server-side rate cache.
- v57 dropdown selection, v56 creator assignment/live budget prompt, v55 currency/OCR, v54 settlement locks/privacy and v53 notification fixes remain included.

No database migration is required from v57 to v58.
