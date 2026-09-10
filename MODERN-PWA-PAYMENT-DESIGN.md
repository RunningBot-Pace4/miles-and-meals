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

The production build completed successfully. The automated suite passed 278
tests; four database concurrency tests were skipped because no isolated test
database was provided. Static regression tests cover the reported squeezed Home
card, tap-target visibility, viewport containment and collapsed payment forms.
Authenticated live-data visual testing should still be performed after Vercel
deployment with test accounts.

## Focused bill-payment card

The expanded **Record payment** area now has one visual hierarchy instead of a
second repeated action heading. It leads with **Confirm money received** or
**Send a payment**, shows the amount still due, presents each receipt as a
clear selectable card, and keeps the calculated payment total visible beside
the action. The final action is a teal button that includes the exact amount,
for example **Confirm RM 5.00 received**.

On phones the heading, amount due, receipt amount and confirmation action stack
before they become cramped. Selected receipts use a teal border and background;
optional payment evidence remains available without competing with the main
task.

## Idle page error follow-up

A second recording showed the same global error while Bill Details was idle.
The shared server-page refresher no longer listens to timers, focus, online or
visibility events. It can refresh a server page only after this tab dispatches a
confirmed-save event. Live client sections continue to use their own API polling
and local retry states.
