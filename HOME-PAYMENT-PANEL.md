# Home payment panel

The Home page now provides one focused place to record a payment or confirm money
received.

## User flow

1. Choose a trip. A trip is always required and is never chosen silently.
2. Choose whether you are paying someone or receiving from someone.
3. Choose the person and enter the amount.
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

## Verification

The production build completed successfully. The automated suite passed 272 tests;
four database concurrency tests were skipped because no isolated test database was
provided. A live two-user payment flow and installed-PWA browser flow should still
be checked after deployment using test accounts.
