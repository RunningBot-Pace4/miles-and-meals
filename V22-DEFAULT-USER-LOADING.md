# Miles & Meals v22 — Default User + Standard Loading

## Expense defaults

For a new expense:

- `Paid by` defaults to the currently logged-in traveler.
- `Split with` defaults to only the currently logged-in traveler.
- Equal split remains the default mode.

If an existing expense is edited, its saved payer and split members are
preserved.

If the country is changed while editing, the payer/split selection resets to
the logged-in traveler when that traveler can access the selected country.

## Standard loading screen

All full-page route loading and saving overlays now use the same Miles & Meals
screen:

```text
Miles & Meals
Travel together. Spend smarter.

● ● ●

Preparing your trip...
Loading Miles & Meals
```

This replaces the app skeleton loader and the old separate saving animation.

## Receipt button

Removed the text:

```text
Auto-fill shop & amount
```

The button now simply shows `Scan receipt` or its active scanning state.

## Database

No Neon schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
