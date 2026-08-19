# Miles & Meals v28 — Blocking Loader + Travel Home

## Country switching

The dashboard destination switch still changes immediately when the country
dropdown changes.

The loading overlay is now rendered into `document.body` through a React portal
instead of remaining inside the dashboard hero.

This avoids stacking-context problems from the hero/card layout.

While an action overlay is active:

- it is above the app shell and mobile navigation
- pointer/touch events cannot pass through
- the underlying body cannot scroll
- underlying body children are non-interactive
- the country selector stays in a switching state until the new dashboard
  `selectedId` arrives from the server

This also upgrades every existing action that uses `SavingOverlay`.

## Home travel theme

The dashboard now has a stronger travel identity while keeping the Miles &
Meals teal + amber brand.

### Current journey card

The main hero now looks more like a boarding pass / travel wallet:

- current destination
- country code
- trip date range
- local currency / destination count
- boarding-stamp treatment
- route-line / plane decoration
- destination selector
- trip wallet summary

### Wallet summary

Spent, Budget and Remaining now use travel-wallet styled cards with distinct
teal, sand and sky surfaces.

### Travel shortcuts

Home now provides four destination-style shortcuts:

- Explore the plan
- Find the crew
- Trip wallet
- Settle up

The section uses `Eat · Play · Sleep · Share` as its travel rhythm.

### Palette

The home page/PWA palette now uses:

- lagoon teal
- warm ivory/sand
- amber
- pale travel-sky blue
- subtle coral accents

The browser/PWA theme color is updated to match.

## Database

No database schema change is required for v28.

If v26 schema changes were already applied:

```powershell
npm install
npm test
npm run build
npm run dev
```

If upgrading from v25 or earlier, run `npm run db:push` once first.

Do not reset the database.
