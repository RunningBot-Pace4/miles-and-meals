# Home payment panel

The Home page now provides one focused request list to record a payment or confirm
money received. It replaces both the old four-box money summary and the separate
generic payment form.

## User flow

1. Open the request for the person who should pay or receive. The person and
   direction are already known, so there is no extra person or direction screen.
2. Enter the full or partial amount.
3. Open **Payment details** and choose the required trip.
4. Optionally select one or more receipts.
5. Review the allocation and remaining amount for every affected receipt before
   confirming.

When receipts are selected, the payment applies only to those receipts. When no
receipt is selected, it applies to the oldest unpaid receipts for that trip and
person first. Same-day receipts use their stable receipt ID as the tie-breaker.

An outgoing payment remains pending until its recipient confirms it. An incoming
pending payment is shown separately so it can be confirmed without recording a
duplicate payment.

## Safety rules

- Payments never cross trips, people or currencies.
- Closed trips cannot accept payments.
- Overpayments and balances changed by another user are rejected by the server.
- One payment can cover at most 50 receipts.
- Existing historic payments without receipt allocations are not rewritten.
- No database migration or cleanup script is required for this update.

## Idle Home error fixed

The app previously refreshed some entire server-rendered routes every 15 seconds
while finance and settlement sections were also polling their own API endpoints.
A failed background route refresh could therefore replace Home or Bill Details
with the global error screen while the user was idle. Timer, focus, online and
visibility events can no longer refresh a whole server page. Finance and payment
sections still refresh automatically and handle temporary request failures
locally; a full server-page refresh is reserved for a confirmed save.

## Verification

The production build completed successfully. The automated suite passed 278 tests;
four database concurrency tests were skipped because no isolated test database was
provided. A live two-user payment flow and installed-PWA browser flow should still
be checked after deployment using test accounts.
