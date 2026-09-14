# Cancelled-payment notice and refresh

The green Home message was a local acknowledgement of the previous save.
It was not tied to the live ledger, so it could still say awaiting confirmation
after the payment had been cancelled.

This update clears that acknowledgement when:
- a payment update event arrives;
- refreshed payment statuses or balances change;
- the user returns with browser Back or focuses the app;
- eight seconds have elapsed, even if refreshing fails.

The live payment cards remain the source of current status. Identical polling
results do not repeatedly reset the acknowledgement. A successful cancellation
or reversal now includes the saved-event detail needed by server-page refresh,
as well as triggering the existing live settlement refresh. Failed cancellation
requests do not emit a success event.

Verification: 329 automated tests passed; four database integration tests were
skipped. New tests exercise the actual Home panel notice across cancellation
events, changed/unchanged polling results, returning to the page and expiry.
Live database and installed-phone verification were not performed.

Deploy the complete package using DEPLOY-VERCEL.md. No SQL migration or data
reset is required. This update includes the previous amount-remainder and PWA
layout fixes. Deployment is not performed automatically.
