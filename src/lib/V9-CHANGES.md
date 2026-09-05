# Miles & Meals v9

## Fixed

- Saving an expense now shows a full-screen Miles & Meals loading overlay.
- Blank `actualConvertedAmount` no longer becomes numeric `0` during Zod coercion.
- Equal split preview uses the same cent-rounding logic as the server.
- Legacy expenses with `actual_converted_amount = 0.00` fall back to the normal converted amount in the UI/dashboard.
- Dashboard greeting uses the authenticated user's real `name`; it never hardcodes `Admin`.
- Dashboard welcome copy now uses a teal-to-amber gradient.

## Important for an already-bad expense

New expenses save correctly. If an older expense already has zero split rows from
the previous bug, open it in Edit Expense and save it once with v9. The server
will rebuild that expense's split rows using the corrected total.
