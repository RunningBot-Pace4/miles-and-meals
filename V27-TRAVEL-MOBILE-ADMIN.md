# Miles & Meals v27 — Travel Theme, Mobile Planner Fix, Admin UX

## Admin user access

The Admin user-access area is redesigned for faster use:

- Search by name, email, role, trip or country
- Active sessions sort to the top
- Summary counters for users, active sessions and assigned travelers
- Compact traveler rows instead of large always-expanded cards
- Expand a traveler only when country access/account detail is needed
- Last login remains visible without expanding
- Country access uses destination-style chips
- Configured countries can be shown/hidden independently

## Mobile planner fixes

The iPhone issue where native Date and Time fields extended outside the planner
card is handled with dedicated mobile-safe controls.

Date/time inputs now use:

- strict `width: 100%`
- `min-width: 0`
- `max-width: 100%`
- inline-size constraints
- mobile-only native appearance normalization
- overflow containment on the field wrapper

Planner mobile forms are forced to one column and clipped safely inside the
card.

The bottom navigation now:

- has additional page safe-space below content
- moves out of the way while an input/select/textarea is focused
- gives planner controls extra scroll margin so fields can move above the nav

## Dashboard destination switcher

The separate `View` button has been removed.

Changing the destination dropdown immediately navigates to the selected country
and refreshes dashboard spending, budget and balances.

`All countries` remains available.

## Travel visual theme

The existing teal/amber identity is retained but the UI now has a stronger
travel character:

- sea/lagoon teal
- warm sand surfaces
- amber destination accents
- subtle route-line motif on dashboard hero
- destination-pin styling
- ticket-style country cards
- passport-stamp inspired admin crew count
- warmer ivory page background

## Database

v27 adds no database schema changes.

If the v26 database migration was already applied:

```powershell
npm install
npm test
npm run build
npm run dev
```

If upgrading from v25 or earlier, apply the v26 schema once:

```powershell
npm run db:push
```

Do not reset the database.
