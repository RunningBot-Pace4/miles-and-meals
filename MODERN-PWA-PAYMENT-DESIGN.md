# Modern PWA payment design

## What changed

- Payment request cards now switch to a two-column identity layout and a
  full-width action area at 900px and below. Names, amounts and form controls can
  no longer compete for the same narrow row.
- Shared mobile guards constrain panels, forms, media and controls to the
  viewport and clip accidental page-level horizontal overflow.
- Expense actions are real tap targets: **View bill & payments** is the clear
  primary action, **Edit** and **View receipt** are secondary actions, and
  **Delete** is a separate red action.
- Bill details now lead with the people and balance, use compact progress tiles,
  and keep the payment form collapsed under **Record payment**.
- Person statements lead with the outstanding amount, use card-based bills and
  history, and also keep payment entry collapsed until requested.
- Empty payment history is presented as a designed state instead of loose text.

## Responsive behaviour

- Desktop: payment identity, amount and action may share a row when sufficient
  width is available.
- Tablet and phone (900px and below): identity and amount stay readable at the
  top; every payment control moves to a full-width row underneath.
- Small phone (560px and below): expense actions and payment metrics use compact
  two-column grids.
- Very narrow phone (350px and below): metrics and actions become one column.

## Verification

The production build completed successfully. The automated suite passed 277
tests; four database concurrency tests were skipped because no isolated test
database was provided. Static regression tests cover the reported squeezed Home
card, tap-target visibility, viewport containment and collapsed payment forms.
Authenticated live-data visual testing should still be performed after Vercel
deployment with test accounts.
