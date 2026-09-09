# Simpler Home and payment feedback

## Home and payment flow

Home now displays your own four money totals, rather than a full group list
with inline payment forms. Unpaid incoming amounts exclude transfers already
awaiting confirmation, so the cards do not double-count those payments.

Use Home → View bills & pay → open a bill → select its amount and record payment.
The person statement is optional. Use Payments for receiver confirmations,
general/group settlement and audit history. General payments do not automatically
identify a receipt; select a bill when you want receipt-specific tracking.

The header uses a warm postcard/travel-journal design with route artwork, a
short headline, personal journal label, trip name and dates. This design has
not been visually verified on real mobile devices in this environment.

## Payment feedback fixes

- Push delivery is scheduled with Next.js after(), after the payment response.
  The financial transaction still finishes before success is returned, and
  activity logging retains its existing best-effort behavior.
- Successfully recorded bill allocations clear their selection, preventing the
  same selection from leaving the action stuck on Refreshing balance.
- Saved transfers display Payment saved instead of an indefinite spinner.
  General-payment actions remain locked until new balance data arrives.
- The success event identifies a completed save, allowing the bill page to
  request updated server data immediately after its own input was submitted.
  Normal background refresh still defers during editing.
- Settlement-summary timeout increases from 3.5 to 10 seconds so normal slower
  database responses are less likely to be aborted and retried at the next poll.
- No measured production latency improvement is claimed: actual speed depends
  on the live database, server and network.

## Screenshot error: not yet diagnosed

The supplied screenshot is the global error fallback. It does not identify
whether the original exception came from server rendering, a database request,
or another runtime failure. The earlier explanation about interrupted requests
or app updates was too specific without evidence.

Error pages now use neutral wording and display the server error digest when
available. To diagnose the actual failure, capture the page URL, action just
before failure and the matching Vercel Runtime Logs error/stack (redact secrets).
This package does not claim the screenshot's root cause is fixed.

## Verification and deployment

Unit tests: 255 passed, four database integration tests skipped. Production build
passed. Real-account payment latency and
the screenshot failure still require live validation. No database changes or
reset required. Email verification remains disabled as requested.
