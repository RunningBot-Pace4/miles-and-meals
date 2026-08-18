# Miles & Meals v12 — Admin Dropdown + Auto-dismiss Notice

## Fixed

### Duplicate trip options

Legacy duplicate trip names are collapsed in the Admin trip dropdown.

Future duplicate trip creation is blocked for the same Admin when the normalized
trip name already exists.

If only one unique trip exists, the Add Country form selects it automatically.

Existing duplicate database rows are NOT deleted automatically because one may
already contain countries, expenses, or other trip data.

### Success notification

Admin success messages now appear as a floating toast and automatically
disappear after 3.5 seconds. They can also be dismissed manually.

## Database

No schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
