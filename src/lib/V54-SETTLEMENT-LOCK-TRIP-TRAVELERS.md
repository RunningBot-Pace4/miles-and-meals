# Miles & Meals v54 — Completed Payment Lock + Trip Traveler Permissions

## Completed settlement records

- Once a settlement reaches `SETTLED`, it is shown under **Completed payments**.
- Completed rows are labeled **Completed · View only**.
- There is no settlement PATCH or DELETE API, so completed payment records cannot be edited or deleted through the application.
- New future balances between the same travelers can still create a new settlement; the old completed record remains immutable history.

## Trip Owner traveler assignment

- Trip Owner can assign or remove active travelers from trips they own.
- One-country trip access and trip membership are kept in sync.
- Removing a traveler removes their trip membership only after they have no remaining country access in that trip.
- The trip creator/Trip Owner cannot be unassigned.

## Privacy

- System Admin can see traveler **name + email**.
- Trip Owner receives the active traveler directory with **name only**.
- Regular trip traveler screens continue to use **name only**.

No database migration is required from v53 to v54.
