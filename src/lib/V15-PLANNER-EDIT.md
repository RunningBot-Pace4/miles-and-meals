# Miles & Meals v15 — Editable Planner + Proposed By

## Added

All planner categories can now be edited:

- Plan / itinerary
- Places
- Meals
- Shopping
- Bookings

Editable fields include country, date, title, time, area, type, status,
priority, estimated cost, quantity, provider, confirmation number, link and
notes where relevant.

Every planner card now shows:

`Proposed by <traveler name>`

at the bottom-left.

The proposer is based on the existing `travel_items.created_by` field and does
not change when another authorized traveler edits the suggestion.

## Permissions

A traveler can edit a planner item only when they have access to the item's
current country and the destination country selected in the edit form.

Admins keep their existing all-country access.

## Database

No schema change is required because `travel_items.created_by` already exists.

Run:

```powershell
npm install
npm test
npm run build
npm run dev
```
