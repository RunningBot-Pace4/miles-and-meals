# Payment history and simpler navigation

## What changed

- Every expense now has a read-only Bill & payment history link. The detail
  page displays the receipt viewer, each traveler's original share, reimbursement
  progress for each payer/receiver pair, and all payments explicitly allocated
  to that bill. Each record shows bill allocation versus total transfer, method,
  reference, note, sent/confirmed/reversed time, status and permitted proof link.
- Country membership is checked before loading the bill ledger; payment-proof
  links are restricted to the payment parties and trip managers. Malformed or
  inaccessible bill IDs return not found.
- Bill progress distinguishes Confirmed paid, Awaiting confirmation and Still
  to pay. Pending amounts remain reserved by the existing financial model so
  another payment cannot accidentally duplicate them. Full pending payments no
  longer display the allocator's all-settled message.
- Reversed/cancelled records remain in history but do not count toward progress.
  General/unassigned payments and group offsets are never guessed onto receipts.
  As explained on the detail screen, an uncovered bill amount may differ from
  the actual direct/net balance due; check the statement before paying.
- Person statements and settlement bill rows use the same progress calculation.
  Aggregate labels explicitly state when totals include pending payments.
- Spend opens the expense list directly, with Expenses, Settle Up, Budgets and
  Needs review tabs. Needs review lists only receipt images still needing review;
  reviewed images remain available in Expenses.
- Updates opens personal notifications directly, with a Trip activity tab.
- Trip Story opens Memories directly, with a Highlights tab.
- Trip selectors preserve the consolidated screen when changing trips.
- Home includes expandable next steps using existing trip data, with access to
  the detailed companion checks. Settlement details remain collapsed by default.
- Home / Plan / Add / Spend / More stays unchanged. Older direct page URLs are
  retained for existing bookmarks, notifications and installed PWA links.

## Validation and limits

- 246 unit/contract tests passed, including five new payment-progress cases.
- Production build, TypeScript, source integrity and release validators passed.
- Four database integration tests require a separate TEST_DATABASE_URL and were
  skipped. Browser/PWA visual checks and authenticated real-data flows remain
  unverified in this environment (browser download previously timed out).
- No SQL migration, live database write or external deployment was performed.
- This is an updated source package, not a certification of the live app.

## Where to try it

1. Spend → Expenses → Bill & payment history.
2. Spend → Settle Up → original bills → View person statement.
3. On a test trip, assign RM20 to a RM50 breakfast share: pending receipt should
   show RM0 confirmed, RM20 awaiting confirmation and RM30 still to pay.
4. Confirm receipt: RM20 confirmed, RM0 pending and RM30 still to pay.
5. Reverse it: the history remains, while the bill returns to RM50 uncovered.
6. Check other bills and traveller pairs are unaffected. Test a general payment
   too: it must remain unassigned and must not identify a receipt automatically.

Deploy using DEPLOY-VERCEL.md, with the existing V93–V95 database schema.
