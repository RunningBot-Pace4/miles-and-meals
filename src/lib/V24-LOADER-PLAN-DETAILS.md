# Miles & Meals v24 — Eat / Play / Sleep + Plan Details

## Loading screen

The generic route loading screen now uses:

```text
Eat · Play · Sleep
```

The large generic loading copy has been removed:

```text
Preparing your trip...
Loading plans, expenses and balances.
```

Action-specific loading overlays still keep useful action text such as saving
an expense or refreshing locations.

## Planner details

Planner cards remain compact, but every card now includes:

```text
View details
```

The detail viewer shows the saved information in a responsive modal:

- Section
- Country
- Date
- Time
- City / area
- Type
- Status
- Priority
- Estimated cost
- Quantity
- Provider
- Confirmation number
- Notes
- Map / booking link
- Proposed by

Empty values display as `—`.

The detail viewer works for Plan, Places, Meals, Shopping and Bookings.

On mobile the viewer behaves like a large bottom sheet and collapses the
details into a single column.

## Database

No Neon schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
